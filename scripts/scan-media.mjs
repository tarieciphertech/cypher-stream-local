#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.MEDIA_ROOT ?? path.resolve(process.cwd(), "media"));
const databaseUrl = process.env.DATABASE_URL;
const dryRun = process.argv.includes("--dry-run");

if (!databaseUrl && !dryRun) throw new Error("DATABASE_URL is required.");

const videoExtensions = new Set([".mp4", ".mkv", ".webm", ".mov", ".avi", ".m4v", ".ts", ".m2ts"]);

const esc = (value) => String(value ?? "").replace(/'/g, "''");
const slugify = (value) =>
  String(value).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "untitled";
const idFor = (prefix, value) =>
  createHash("sha256").update(`${prefix}:${value}`).digest("hex").slice(0, 24);

function walk(dir) {
  const result = [];
  if (!existsSync(dir)) return result;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (videoExtensions.has(path.extname(entry.name).toLowerCase())) result.push(full);
  }
  return result;
}

function ffprobe(file) {
  const raw = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=index,codec_type,codec_name,width,height",
    "-of", "json", file
  ], { encoding: "utf8" });
  return JSON.parse(raw);
}

function shellPsql(sql) {
  execFileSync("psql", ["--dbname", databaseUrl, "--set", "ON_ERROR_STOP=1"], {
    input: sql, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"]
  });
}

const moviesRoot = path.join(root, "movies");
const seriesRoot = path.join(root, "series");
const files = [
  ...walk(moviesRoot).map((file) => ({ file, type: "film", base: moviesRoot })),
  ...walk(seriesRoot).map((file) => ({ file, type: "series", base: seriesRoot }))
];

console.log(`Scanning ${root}`);
console.log(`Found ${files.length} video file(s).`);

const statements = ["begin;"];
let scanned = 0;

for (const item of files) {
  const relative = path.relative(root, item.file).split(path.sep).join("/");
  const normalized = relative.replace(/^movies\//, "").replace(/^series\//, "");
  const parts = normalized.split("/").filter(Boolean);
  const fileName = path.basename(item.file);
  const stem = path.basename(fileName, path.extname(fileName));
  let titleName = stem;
  let seasonNumber = null;
  let episodeNumber = null;

  if (item.type === "series" && parts.length >= 3) {
    titleName = parts[0];
    const seasonMatch = parts[1].match(/(?:season|s)\s*0*(\d+)/i);
    const episodeMatch =
      stem.match(/(?:^|[ ._-])(?:s\d{1,2})?[ ._-]*e(\d{1,3})(?:[ ._-]|$)/i) ??
      stem.match(/(?:episode|ep)[ ._-]*0*(\d+)/i);
    if (seasonMatch) seasonNumber = Number(seasonMatch[1]);
    if (episodeMatch) episodeNumber = Number(episodeMatch[1]);
  }

  if (item.type === "series" && seasonNumber == null) {
    console.warn(`Skipping series file without a recognizable season: ${relative}`);
    continue;
  }
  if (item.type === "series" && episodeNumber == null) {
    console.warn(`Skipping series file without a recognizable episode: ${relative}`);
    continue;
  }

  let probe;
  try {
    probe = ffprobe(item.file);
  } catch (error) {
    console.warn(`Skipping unreadable media: ${relative}`);
    console.warn(error instanceof Error ? error.message : String(error));
    continue;
  }

  const duration = Number.isFinite(Number(probe.format?.duration))
    ? Math.max(0, Math.round(Number(probe.format.duration)))
    : null;
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  const width = Number.isInteger(video?.width) ? video.width : null;
  const height = Number.isInteger(video?.height) ? video.height : null;
  const ext = path.extname(fileName).toLowerCase();
  const mime = {
    ".mp4": "video/mp4", ".m4v": "video/x-m4v", ".webm": "video/webm",
    ".mov": "video/quicktime", ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo", ".ts": "video/mp2t", ".m2ts": "video/mp2t"
  }[ext] ?? "application/octet-stream";

  const titleId = idFor("title", `${item.type}:${titleName.toLowerCase()}`);
  const assetId = idFor("asset", relative);
  const sourceId = idFor("source", relative);
  const slug = slugify(titleName);
  const runtimeMinutes = duration == null ? "null" : Math.max(1, Math.round(duration / 60));

  statements.push(`
insert into public.titles (id, slug, name, media_type, runtime_minutes, status, updated_at)
values ('${esc(titleId)}', '${esc(slug)}', '${esc(titleName)}', '${item.type}', ${runtimeMinutes}, 'published', now())
on conflict (id) do update set name=excluded.name, media_type=excluded.media_type,
runtime_minutes=excluded.runtime_minutes, status='published', updated_at=now();
`);

  if (item.type === "film") {
    statements.push(`
insert into public.media_assets (id, title_id, asset_type, storage_key, mime_type, width, height, duration_seconds)
values ('${esc(assetId)}', '${esc(titleId)}', 'video', '${esc(relative)}', '${esc(mime)}', ${width ?? "null"}, ${height ?? "null"}, ${duration ?? "null"})
on conflict (id) do update set storage_key=excluded.storage_key, mime_type=excluded.mime_type,
width=excluded.width, height=excluded.height, duration_seconds=excluded.duration_seconds;
insert into public.video_sources (id, media_asset_id, source_type, source_url, is_default, width, height)
values ('${esc(sourceId)}', '${esc(assetId)}', 'mp4', '/media/${esc(relative)}', true, ${width ?? "null"}, ${height ?? "null"})
on conflict (id) do update set source_url=excluded.source_url, is_default=true, width=excluded.width, height=excluded.height;
`);
  } else {
    const seasonId = idFor("season", `${titleId}:s${seasonNumber}`);
    const episodeId = idFor("episode", `${titleId}:s${seasonNumber}:e${episodeNumber}`);
    statements.push(`
insert into public.seasons (id, title_id, season_number, name)
values ('${esc(seasonId)}', '${esc(titleId)}', ${seasonNumber}, 'Season ${seasonNumber}')
on conflict (title_id, season_number) do update set name=excluded.name;
insert into public.episodes (id, season_id, episode_number, name, runtime_minutes)
values ('${esc(episodeId)}', '${esc(seasonId)}', ${episodeNumber}, '${esc(stem)}', ${runtimeMinutes})
on conflict (id) do update set name=excluded.name, runtime_minutes=excluded.runtime_minutes;
insert into public.media_assets (id, episode_id, asset_type, storage_key, mime_type, width, height, duration_seconds)
values ('${esc(assetId)}', '${esc(episodeId)}', 'video', '${esc(relative)}', '${esc(mime)}', ${width ?? "null"}, ${height ?? "null"}, ${duration ?? "null"})
on conflict (id) do update set storage_key=excluded.storage_key, mime_type=excluded.mime_type,
width=excluded.width, height=excluded.height, duration_seconds=excluded.duration_seconds;
insert into public.video_sources (id, media_asset_id, source_type, source_url, is_default, width, height)
values ('${esc(sourceId)}', '${esc(assetId)}', 'mp4', '/media/${esc(relative)}', true, ${width ?? "null"}, ${height ?? "null"})
on conflict (id) do update set source_url=excluded.source_url, is_default=true, width=excluded.width, height=excluded.height;
`);
  }

  scanned++;
  console.log(`[scan] ${relative}`);
}

statements.push("commit;");

if (dryRun) console.log(`Dry run complete. ${scanned} media file(s) would be imported.`);
else if (scanned > 0) {
  shellPsql(statements.join("\n"));
  console.log(`Imported ${scanned} media file(s).`);
} else console.log("Nothing to import.");
