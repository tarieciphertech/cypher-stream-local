import { Router, type IRouter } from "express";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { and, asc, countDistinct, desc, eq, ilike, or } from "drizzle-orm";
import { CatalogResponse, CatalogTitleDetail } from "@workspace/api-zod";
import { getDb, episodes, genres, mediaAssets, seasons, titleGenres, titles, videoSources } from "@workspace/db";

const router: IRouter = Router();

const mediaRoot = path.resolve(process.env.MEDIA_ROOT ?? path.resolve(process.cwd(), "media"));
const transcodeCacheRoot = path.resolve(
  process.env.TRANSCODE_CACHE_ROOT ?? path.resolve(process.cwd(), ".cache/transcodes"),
);
const browserPlayableExtensions = new Set([".mp4", ".webm", ".m4v", ".mov"]);

const resolveLocalMediaSource = (sourceUrl: string) => {
  if (!sourceUrl.startsWith("/media/")) return null;
  const relative = decodeURIComponent(sourceUrl.slice("/media/".length));
  const resolved = path.resolve(mediaRoot, relative);
  if (resolved !== mediaRoot && !resolved.startsWith(`${mediaRoot}${path.sep}`)) return null;
  return resolved;
};

const getStreamInfo = (inputPath: string) =>
  new Promise<{ videoCodec: string | null; audioCodec: string | null }>((resolve, reject) => {
    const probe = spawn("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=codec_name",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);
    const audioProbe = spawn("ffprobe", [
      "-v", "error",
      "-select_streams", "a:0",
      "-show_entries", "stream=codec_name",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);
    let video = "";
    let audio = "";
    let failed = false;
    const fail = (error: Error) => {
      if (failed) return;
      failed = true;
      reject(error);
    };
    probe.stdout.on("data", (chunk) => { video += chunk.toString(); });
    audioProbe.stdout.on("data", (chunk) => { audio += chunk.toString(); });
    probe.on("error", fail);
    audioProbe.on("error", fail);
    let videoDone = false;
    let audioDone = false;
    const finish = () => {
      if (failed || !videoDone || !audioDone) return;
      resolve({
        videoCodec: video.trim().split(/\\s+/)[0] || null,
        audioCodec: audio.trim().split(/\\s+/)[0] || null,
      });
    };
    probe.on("close", (code) => {
      if (code !== 0) fail(new Error("ffprobe video inspection failed"));
      else { videoDone = true; finish(); }
    });
    audioProbe.on("close", (code) => {
      if (code !== 0) audio = "";
      audioDone = true;
      finish();
    });
  });


const sendCachedMp4 = async (
  req: import("express").Request,
  res: import("express").Response,
  filePath: string,
  playbackHeader: string,
) => {
  const stat = await fs.promises.stat(filePath);
  const size = stat.size;
  const range = req.headers.range;
  res.setHeader("X-Cypher-Stream-Playback", playbackHeader);
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=3600");

  if (!range) {
    res.setHeader("Content-Length", String(size));
    if (req.method === "HEAD") return res.status(200).end();
    return fs.createReadStream(filePath).pipe(res);
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return res.status(416).setHeader("Content-Range", `bytes */${size}`).end();

  let start: number;
  let end: number;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) {
      return res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
    }
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Number(match[2]);
  }

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) {
    return res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
  }

  end = Math.min(end, size - 1);
  res.status(206);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
  res.setHeader("Content-Length", String(end - start + 1));
  if (req.method === "HEAD") return res.end();
  return fs.createReadStream(filePath, { start, end }).pipe(res);
};

const streamCompatiblePlayback = async (
  req: import("express").Request,
  res: import("express").Response,
  sourceUrl: string,
  cacheKey: string,
) => {
  const inputPath = resolveLocalMediaSource(sourceUrl);
  if (!inputPath || !fs.existsSync(inputPath)) {
    res.status(404).json({ error: "Media source not found" });
    return;
  }

  if (browserPlayableExtensions.has(path.extname(inputPath).toLowerCase())) {
    res.setHeader("X-Cypher-Stream-Playback", "direct");
    res.sendFile(inputPath);
    return;
  }

  fs.mkdirSync(transcodeCacheRoot, { recursive: true });
  const cachePath = path.join(transcodeCacheRoot, `v6-${cacheKey}.mp4`);

  // Completed MP4 caches are served with Express's native byte-range support.
  // This gives browsers normal seek/buffer behavior instead of making them
  // consume one long-lived fragmented-MP4 response.
  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 0) {
    await sendCachedMp4(req, res, cachePath, "cached-range");
    return;
  }

  try {
    const info = await getStreamInfo(inputPath);
    const canRemux = info.videoCodec === "h264" &&
      (!info.audioCodec || ["aac", "mp3"].includes(info.audioCodec));

    const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-nostdin",
      "-i", inputPath,
      "-map", "0:v:0",
      "-map", "0:a:0?",
      ...(canRemux
        ? ["-c", "copy"]
        : [
            "-c:v", "libx264",
            "-preset", process.env.FFMPEG_PRESET ?? "veryfast",
            "-crf", process.env.FFMPEG_CRF ?? "22",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
          ]),
      // Keep the MP4 browser-friendly and seekable once the preparation pass
      // completes. The file is atomically renamed into the cache afterwards.
      "-movflags", "+faststart",
      "-f", "mp4",
      tempPath,
    ];

    req.log.info(
      {
        message: canRemux
          ? "Preparing browser-compatible MP4 remux"
          : "Preparing browser-compatible H.264/AAC transcode",
        file: path.basename(inputPath),
        videoCodec: info.videoCodec,
        audioCodec: info.audioCodec,
      },
      "playback preparation",
    );

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
      const stderr: string[] = [];

      ffmpeg.stderr.on("data", (chunk) => stderr.push(chunk.toString()));
      ffmpeg.on("error", reject);
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr.join("").trim().slice(-4000) || `FFmpeg exited with code ${code}`));
      });

      req.on("close", () => {
        if (!res.headersSent && !ffmpeg.killed) ffmpeg.kill("SIGTERM");
      });
    });

    const stat = await fs.promises.stat(tempPath);
    if (!stat.size) throw new Error("FFmpeg produced an empty playback file");

    await fs.promises.rename(tempPath, cachePath);

    req.log.info(
      { cachePath, bytes: stat.size },
      "Browser-compatible playback cached; serving with HTTP ranges",
    );

    await sendCachedMp4(req, res, cachePath, canRemux ? "remux-range" : "transcode-range");
  } catch (error) {
    req.log.error({ err: error }, "browser-compatible playback failed");
    const tempPrefix = `${cachePath}.`;
    try {
      for (const entry of await fs.promises.readdir(transcodeCacheRoot)) {
        if (entry.startsWith(path.basename(tempPrefix)) && entry.endsWith(".tmp")) {
          await fs.promises.rm(path.join(transcodeCacheRoot, entry), { force: true });
        }
      }
    } catch {
      // Best-effort cleanup only.
    }
    if (!res.headersSent) {
      res.status(503).json({
        error: "Unable to create browser-compatible playback",
        detail: "Check that FFmpeg is installed and the source media is readable.",
      });
    }
  }
};

const parsePositiveInt = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(Math.floor(parsed), max);
};

router.get("/playback/episodes/:episodeId", async (req, res) => {
  try {
    const db = getDb();
    const row = (await db
      .select({ sourceUrl: videoSources.sourceUrl })
      .from(episodes)
      .innerJoin(mediaAssets, eq(mediaAssets.episodeId, episodes.id))
      .innerJoin(videoSources, eq(videoSources.mediaAssetId, mediaAssets.id))
      .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
      .innerJoin(titles, eq(titles.id, seasons.titleId))
      .where(and(eq(episodes.id, req.params.episodeId), eq(titles.status, "published")))
      .orderBy(desc(videoSources.isDefault))
      .limit(1))[0];

    if (!row?.sourceUrl) {
      res.status(404).json({ error: "Episode source not found" });
      return;
    }

    streamCompatiblePlayback(req, res, row.sourceUrl, `episode-${req.params.episodeId}`);
  } catch (error) {
    req.log.error({ err: error }, "episode playback request failed");
    if (!res.headersSent) res.status(503).json({ error: "Playback is temporarily unavailable" });
  }
});

router.get("/playback/titles/:titleId", async (req, res) => {
  try {
    const db = getDb();
    const row = (await db
      .select({ sourceUrl: videoSources.sourceUrl })
      .from(mediaAssets)
      .innerJoin(videoSources, eq(videoSources.mediaAssetId, mediaAssets.id))
      .innerJoin(titles, eq(titles.id, mediaAssets.titleId))
      .where(and(eq(mediaAssets.titleId, req.params.titleId), eq(titles.status, "published")))
      .orderBy(desc(videoSources.isDefault))
      .limit(1))[0];

    if (!row?.sourceUrl) {
      res.status(404).json({ error: "Title source not found" });
      return;
    }

    streamCompatiblePlayback(req, res, row.sourceUrl, `title-${req.params.titleId}`);
  } catch (error) {
    req.log.error({ err: error }, "title playback request failed");
    if (!res.headersSent) res.status(503).json({ error: "Playback is temporarily unavailable" });
  }
});

router.get("/catalog", async (req, res) => {
  try {
    const db = getDb();
    const limit = parsePositiveInt(req.query.limit, 24, 100);
    const offset = parsePositiveInt(req.query.offset, 0, 10_000);
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const genre = typeof req.query.genre === "string" ? req.query.genre : undefined;
    const search = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
    const featured = req.query.featured === "true" ? true : undefined;

    const filters = [eq(titles.status, "published")];
    if (type === "film" || type === "series") filters.push(eq(titles.mediaType, type));
    if (featured) filters.push(eq(titles.featured, true));
    if (search) {
      filters.push(
        or(ilike(titles.name, `%${search}%`), ilike(titles.synopsis, `%${search}%`))!,
      );
    }

    const whereClause = genre
      ? and(...filters, eq(genres.slug, genre))
      : and(...filters);

    const rows = await db
      .select({ title: titles, genre: genres })
      .from(titles)
      .leftJoin(titleGenres, eq(titleGenres.titleId, titles.id))
      .leftJoin(genres, eq(genres.id, titleGenres.genreId))
      .where(whereClause)
      .orderBy(desc(titles.featured), desc(titles.updatedAt), asc(titles.name))
      .limit(limit)
      .offset(offset);

    const totalRows = await db
      .select({ count: countDistinct(titles.id) })
      .from(titles)
      .leftJoin(titleGenres, eq(titleGenres.titleId, titles.id))
      .leftJoin(genres, eq(genres.id, titleGenres.genreId))
      .where(whereClause);

    const grouped = new Map<string, CatalogResponse["items"][number]>();
    for (const row of rows) {
      const mapped = grouped.get(row.title.id) ?? {
        id: row.title.id,
        slug: row.title.slug,
        name: row.title.name,
        synopsis: row.title.synopsis,
        mediaType: row.title.mediaType as "film" | "series",
        releaseYear: row.title.releaseYear,
        maturityRating: row.title.maturityRating,
        runtimeMinutes: row.title.runtimeMinutes,
        status: row.title.status as "draft" | "published" | "archived",
        posterUrl: row.title.posterUrl,
        backdropUrl: row.title.backdropUrl,
        logoUrl: row.title.logoUrl,
        accent: row.title.accent,
        featured: row.title.featured,
        badge: row.title.badge,
        genres: [],
        sourceUrl: null,
      };
      if (row.genre && !mapped.genres.some((item) => item.id === row.genre!.id)) {
        mapped.genres.push({ id: row.genre.id, slug: row.genre.slug, name: row.genre.name });
      }
      grouped.set(row.title.id, mapped);
    }

    const response = CatalogResponse.parse({
      items: [...grouped.values()],
      total: Number(totalRows[0]?.count ?? 0),
      limit,
      offset,
    });

    res.json(response);
  } catch (error) {
    req.log.error({ err: error }, "catalog request failed");
    res.status(503).json({ error: "Catalog is temporarily unavailable" });
  }
});

router.get("/titles/:id", async (req, res) => {
  try {
    const db = getDb();
    const titleRows = await db
      .select({ title: titles, genre: genres })
      .from(titles)
      .leftJoin(titleGenres, eq(titleGenres.titleId, titles.id))
      .leftJoin(genres, eq(genres.id, titleGenres.genreId))
      .where(and(eq(titles.id, req.params.id), eq(titles.status, "published")));

    const first = titleRows[0];
    if (!first) {
      res.status(404).json({ error: "Title not found" });
      return;
    }

    const genreList = titleRows
      .filter((row) => row.genre)
      .map((row) => ({ id: row.genre!.id, slug: row.genre!.slug, name: row.genre!.name }))
      .filter((genre, index, list) => list.findIndex((item) => item.id === genre.id) === index);

    const seasonRows = await db
      .select({ season: seasons, episode: episodes })
      .from(seasons)
      .leftJoin(episodes, eq(episodes.seasonId, seasons.id))
      .where(eq(seasons.titleId, req.params.id))
      .orderBy(asc(seasons.seasonNumber), asc(episodes.episodeNumber));

    const titleSourceRows = await db
      .select({ source: videoSources, asset: mediaAssets })
      .from(mediaAssets)
      .innerJoin(videoSources, eq(videoSources.mediaAssetId, mediaAssets.id))
      .where(eq(mediaAssets.titleId, req.params.id))
      .orderBy(desc(videoSources.isDefault));

    const episodeSourceRows = await db
      .select({ source: videoSources, asset: mediaAssets, episode: episodes, season: seasons })
      .from(mediaAssets)
      .innerJoin(videoSources, eq(videoSources.mediaAssetId, mediaAssets.id))
      .innerJoin(episodes, eq(episodes.id, mediaAssets.episodeId))
      .innerJoin(seasons, eq(seasons.id, episodes.seasonId))
      .where(eq(seasons.titleId, req.params.id))
      .orderBy(desc(videoSources.isDefault));

    const titleSourceUrl = titleSourceRows[0]?.source.sourceUrl ?? null;
    const episodeSourceUrls = new Map<string, string>();
    for (const row of episodeSourceRows) {
      if (!episodeSourceUrls.has(row.episode.id)) episodeSourceUrls.set(row.episode.id, row.source.sourceUrl);
    }

    const seasonMap = new Map<string, CatalogTitleDetail["seasons"][number]>();
    for (const row of seasonRows) {
      const season = seasonMap.get(row.season.id) ?? {
        id: row.season.id,
        seasonNumber: row.season.seasonNumber,
        name: row.season.name,
        synopsis: row.season.synopsis,
        episodes: [],
      };
      if (row.episode) {
        season.episodes.push({
          id: row.episode.id,
          episodeNumber: row.episode.episodeNumber,
          name: row.episode.name,
          synopsis: row.episode.synopsis,
          runtimeMinutes: row.episode.runtimeMinutes,
          thumbnailUrl: row.episode.thumbnailUrl,
          sourceUrl: episodeSourceUrls.get(row.episode.id) ?? null,
        });
      }
      seasonMap.set(row.season.id, season);
    }

    const response = CatalogTitleDetail.parse({
      id: first.title.id,
      slug: first.title.slug,
      name: first.title.name,
      synopsis: first.title.synopsis,
      mediaType: first.title.mediaType,
      releaseYear: first.title.releaseYear,
      maturityRating: first.title.maturityRating,
      runtimeMinutes: first.title.runtimeMinutes,
      status: first.title.status,
      posterUrl: first.title.posterUrl,
      backdropUrl: first.title.backdropUrl,
      logoUrl: first.title.logoUrl,
      accent: first.title.accent,
      featured: first.title.featured,
      badge: first.title.badge,
      genres: genreList,
      sourceUrl: titleSourceUrl,
      seasons: [...seasonMap.values()],
    });

    res.json(response);
  } catch (error) {
    req.log.error({ err: error }, "title detail request failed");
    res.status(503).json({ error: "Catalog is temporarily unavailable" });
  }
});

export default router;
