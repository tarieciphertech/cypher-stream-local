import { z } from "zod";

export const CatalogGenre = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
});

export const CatalogTitle = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  synopsis: z.string().nullable(),
  mediaType: z.enum(["film", "series"]),
  releaseYear: z.number().int().nullable(),
  maturityRating: z.string().nullable(),
  runtimeMinutes: z.number().int().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  posterUrl: z.string().nullable(),
  backdropUrl: z.string().nullable(),
  logoUrl: z.string().nullable(),
  accent: z.string().nullable(),
  featured: z.boolean(),
  badge: z.string().nullable(),
  genres: z.array(CatalogGenre),
});

export const CatalogEpisode = z.object({
  id: z.string(),
  episodeNumber: z.number().int(),
  name: z.string(),
  synopsis: z.string().nullable(),
  runtimeMinutes: z.number().int().nullable(),
  thumbnailUrl: z.string().nullable(),
});

export const CatalogSeason = z.object({
  id: z.string().uuid(),
  seasonNumber: z.number().int(),
  name: z.string().nullable(),
  synopsis: z.string().nullable(),
  episodes: z.array(CatalogEpisode),
});

export const CatalogTitleDetail = CatalogTitle.extend({
  seasons: z.array(CatalogSeason),
});

export const CatalogResponse = z.object({
  items: z.array(CatalogTitle),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export type CatalogGenre = z.infer<typeof CatalogGenre>;
export type CatalogTitle = z.infer<typeof CatalogTitle>;
export type CatalogEpisode = z.infer<typeof CatalogEpisode>;
export type CatalogSeason = z.infer<typeof CatalogSeason>;
export type CatalogTitleDetail = z.infer<typeof CatalogTitleDetail>;
export type CatalogResponse = z.infer<typeof CatalogResponse>;
