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

const activeTranscodes = new Map<string, Promise<string>>();

const transcodeToMp4 = (inputPath: string, cachePath: string, log: (message: string) => void) => {
  const existing = activeTranscodes.get(cachePath);
  if (existing) return existing;

  const promise = new Promise<string>((resolve, reject) => {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
    const ffmpeg = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "error",
      "-i", inputPath,
      "-map", "0:v:0", "-map", "0:a:0?",
      "-c:v", "libx264",
      "-preset", process.env.FFMPEG_PRESET ?? "veryfast",
      "-crf", process.env.FFMPEG_CRF ?? "22",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart",
      "-f", "mp4", tempPath,
    ]);

    const stderr: string[] = [];
    ffmpeg.stderr.on("data", (chunk) => stderr.push(chunk.toString()));
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        fs.rename(tempPath, cachePath, (error) => {
          if (error) reject(error);
          else resolve(cachePath);
        });
      } else {
        void fs.promises.rm(tempPath, { force: true });
        reject(new Error(stderr.join("").trim() || `ffmpeg exited with code ${code}`));
      }
    });
  }).finally(() => {
    activeTranscodes.delete(cachePath);
  });

  activeTranscodes.set(cachePath, promise);
  log(`Starting browser-compatible transcode: ${path.basename(inputPath)}`);
  return promise;
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
    res.sendFile(inputPath);
    return;
  }

  fs.mkdirSync(transcodeCacheRoot, { recursive: true });
  const cachePath = path.join(transcodeCacheRoot, `${cacheKey}.mp4`);

  try {
    if (!fs.existsSync(cachePath) || fs.statSync(cachePath).size === 0) {
      await transcodeToMp4(inputPath, cachePath, (message) => req.log.info({ message }, "playback transcode"));
    }
    if (!res.headersSent) res.sendFile(cachePath);
  } catch (error) {
    req.log.error({ err: error }, "browser-compatible transcode failed");
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
