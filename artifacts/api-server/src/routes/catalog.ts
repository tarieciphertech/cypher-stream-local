import { Router, type IRouter } from "express";
import { and, asc, countDistinct, desc, eq, ilike, or } from "drizzle-orm";
import { CatalogResponse, CatalogTitleDetail } from "@workspace/api-zod";
import { getDb, episodes, genres, seasons, titleGenres, titles } from "@workspace/db";

const router: IRouter = Router();

const parsePositiveInt = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(Math.floor(parsed), max);
};

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
      seasons: [...seasonMap.values()],
    });

    res.json(response);
  } catch (error) {
    req.log.error({ err: error }, "title detail request failed");
    res.status(503).json({ error: "Catalog is temporarily unavailable" });
  }
});

export default router;
