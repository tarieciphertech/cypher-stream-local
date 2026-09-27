#!/usr/bin/env node
import { existsSync, mkdirSync, writeFile } from "node:fs";
import { readFile, writeFile as writeFileAsync } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
const mediaRoot = path.resolve(
  process.env.MEDIA_ROOT ?? path.resolve(import.meta.dirname, "..", "media"),
);
const artworkRoot = path.join(mediaRoot, "artwork");
const dryRun = process.argv.includes("--dry-run");

if (!databaseUrl && !dryRun) {
  throw new Error("DATABASE_URL is required.");
}

const tmdbImage = (size, file) => `https://image.tmdb.org/t/p/${size}/${file}`;

const catalog = [
  {
    slug: "ambulance-2022-1080p-bluray-x264-aac5-1-yts-mx",
    name: "Ambulance",
    synopsis:
      "Decorated veteran Will Sharp, desperate for money to cover his wife's medical bills, asks his adoptive brother Danny for help. Danny instead offers him a score: a $32 million bank heist in Los Angeles that sends the brothers and a hijacked ambulance into a desperate fight to escape.",
    mediaType: "film",
    releaseYear: 2022,
    maturityRating: "16",
    poster: tmdbImage("w780", "hUbgg3mMSbY9PlpTxBo4IFUVSd6.jpg"),
    backdrop: tmdbImage("w1280", "vwp5ycCyynwDUb2b79yww1bSXAo.jpg"),
    accent: "#d9a441",
    featured: true,
    badge: "FEATURED",
    genres: ["Action", "Thriller", "Crime"],
  },
  {
    slug: "zero-dark-thirty-2012-720p-brrip-x264-bokutox-yify",
    name: "Zero Dark Thirty",
    synopsis:
      "A chronicle of the decade-long hunt for al-Qaeda leader Osama bin Laden after the September 2001 attacks, culminating in the 2011 operation carried out by Navy SEAL Team 6.",
    mediaType: "film",
    releaseYear: 2012,
    maturityRating: "18",
    poster: tmdbImage("w780", "wNSdSSxowM3WIqmPJNg3RagYbwP.jpg"),
    backdrop: tmdbImage("w1280", "9d2RSOBmA5k6sDQoOkuBxJ9Gf7h.jpg"),
    accent: "#8d9a8f",
    featured: false,
    badge: null,
    genres: ["Thriller", "Drama"],
  },
  {
    slug: "the-chi",
    name: "The Chi",
    synopsis:
      "A coming-of-age drama following a group of interconnected characters on Chicago's South Side as family, friendship, ambition, and responsibility shape their lives.",
    mediaType: "series",
    releaseYear: 2018,
    maturityRating: "TV-MA",
    poster: tmdbImage("w780", "niD8X5pEXpmRUDhSPdDOgI3Gw5Q.jpg"),
    backdrop: tmdbImage("w1280", "ulXewCeBreYuw1fpjpibYQ66RRv.jpg"),
    accent: "#a46b55",
    featured: false,
    badge: null,
    genres: ["Drama"],
  },
  {
    slug: "the-rookie",
    name: "The Rookie",
    synopsis:
      "John Nolan, a small-town man starting over, pursues his dream of becoming an LAPD officer and becomes the department's oldest rookie, navigating training, danger, and the demands of police work.",
    mediaType: "series",
    releaseYear: 2018,
    maturityRating: "16",
    poster: tmdbImage("w780", "bL1mwXDnH5fCxqc4S2n40hoVyoe.jpg"),
    backdrop: tmdbImage("w1280", "yGk5RWR6Pq1r2I7EqRvsYIVitaB.jpg"),
    accent: "#527ca6",
    featured: false,
    badge: null,
    genres: ["Crime", "Drama", "Comedy"],
  },,
  {
    slug: "american-ultra",
    name: "American Ultra",
    synopsis:
      "Mike Howell is an unmotivated small-town stoner who discovers that he is actually a highly trained government operative. When his forgotten skills are activated, he and his girlfriend Phoebe become targets of a deadly operation.",
    mediaType: "film",
    releaseYear: 2015,
    maturityRating: "18",
    poster: "https://images.fandango.com/ImageRenderer/0/0/redesign/static/img/default_poster--dark-mode.png/0/images/masterrepository/Fandango/183689/AmUltra_%20Poster.jpg",
    backdrop: "https://images.fandango.com/ImageRenderer/0/0/redesign/static/img/default_poster--dark-mode.png/0/images/masterrepository/Fandango/183689/AmUltra_%20Poster.jpg",
    accent: "#d26b3d",
    featured: false,
    badge: null,
    genres: ["Action", "Comedy", "Thriller"],
  },
  {
    slug: "crime-101",
    name: "Crime 101",
    synopsis:
      "An elusive thief planning one final score crosses paths with a disillusioned insurance broker while a relentless detective follows the trail of a multi-million-dollar heist.",
    mediaType: "film",
    releaseYear: 2026,
    maturityRating: "16",
    poster: "https://image.tmdb.org/t/p/original/6uZPu5SWTtDpRqhMJH40HLWts2v.jpg",
    backdrop: "https://assets.voxcinemas.com/posters/P_HO00012856.jpg",
    accent: "#a88758",
    featured: false,
    badge: null,
    genres: ["Crime", "Thriller"],
  },
  {
    slug: "this-is-where-i-leave-you",
    name: "This Is Where I Leave You",
    synopsis:
      "After their father dies, four adult siblings return to their childhood home and are asked to stay together for a week, forcing old relationships, rivalries, grief, and family history back into the open.",
    mediaType: "film",
    releaseYear: 2014,
    maturityRating: "16",
    poster: "https://image.tmdb.org/t/p/original/5jqH71EeeVPsq1Rua1aSHBi3zoz.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/njK3bfEYuqwjs8YTkpaDtkoTmVr.jpg",
    accent: "#7d8f9d",
    featured: false,
    badge: null,
    genres: ["Drama", "Comedy"],
  },
  {
    slug: "reacher",
    name: "Reacher",
    synopsis:
      "Jack Reacher, a veteran military police investigator, travels the country as a drifter while uncovering dangerous conspiracies, criminal networks, and cases that pull him back into action.",
    mediaType: "series",
    releaseYear: 2022,
    maturityRating: "TV-MA",
    poster: "https://image.tmdb.org/t/p/original/31GlRQMiDunO8cl3NxTz34U64rf.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/JYgqp8g2kI3SEus9XBDSHukfBN.jpg",
    accent: "#6f8794",
    featured: true,
    badge: "NEW",
    genres: ["Action", "Crime", "Drama"],
  }
];

const esc = (value) => String(value ?? "").replaceAll("'", "''");

async function downloadArtwork(url, fileName) {
  mkdirSync(artworkRoot, { recursive: true });
  const destination = path.join(artworkRoot, fileName);
  if (existsSync(destination)) return destination;

  console.log(`Downloading ${fileName}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Artwork request failed (${response.status}) for ${url}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFileAsync(destination, bytes);
  return destination;
}

function relativeArtworkUrl(fileName) {
  return `/media/artwork/${fileName}`;
}

if (dryRun) {
  console.log("Catalog enrichment dry run:");
  for (const item of catalog) {
    console.log(`- ${item.name}: ${item.genres.join(", ")}; poster + backdrop`);
  }
  process.exit(0);
}

const downloaded = new Map();
for (const item of catalog) {
  const posterFile = `${item.slug}-poster.jpg`;
  const backdropFile = `${item.slug}-backdrop.jpg`;
  await downloadArtwork(item.poster, posterFile);
  await downloadArtwork(item.backdrop, backdropFile);
  downloaded.set(item.slug, {
    posterUrl: relativeArtworkUrl(posterFile),
    backdropUrl: relativeArtworkUrl(backdropFile),
  });
}

const statements = ["begin;"];

for (const item of catalog) {
  const artwork = downloaded.get(item.slug);
  if (!artwork) throw new Error(`Missing artwork for ${item.slug}`);

  statements.push(`
update public.titles
set
  name = '${esc(item.name)}',
  synopsis = '${esc(item.synopsis)}',
  media_type = '${esc(item.mediaType)}',
  release_year = ${item.releaseYear},
  maturity_rating = '${esc(item.maturityRating)}',
  poster_url = '${esc(artwork.posterUrl)}',
  backdrop_url = '${esc(artwork.backdropUrl)}',
  accent = '${esc(item.accent)}',
  featured = ${item.featured ? "true" : "false"},
  badge = ${item.badge == null ? "null" : `'${esc(item.badge)}'`},
  updated_at = now()
where slug = '${esc(item.slug)}';

delete from public.title_genres
where title_id = (select id from public.titles where slug = '${esc(item.slug)}');

`);

  for (const genre of item.genres) {
    const genreSlug = genre.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    statements.push(`
insert into public.genres (slug, name)
values ('${esc(genreSlug)}', '${esc(genre)}')
on conflict (slug) do update set name = excluded.name;

insert into public.title_genres (title_id, genre_id)
select
  (select id from public.titles where slug = '${esc(item.slug)}'),
  (select id from public.genres where slug = '${esc(genreSlug)}')
on conflict do nothing;
`);
  }
}

statements.push("commit;");

execFileSync(
  "psql",
  ["--dbname", databaseUrl, "--set", "ON_ERROR_STOP=1"],
  { input: statements.join("\n"), encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] },
);

console.log(`Enriched ${catalog.length} catalogue titles and stored artwork under ${artworkRoot}`);
