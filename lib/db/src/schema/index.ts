import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const titles = pgTable(
  "titles",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    synopsis: text("synopsis"),
    mediaType: text("media_type").notNull(),
    releaseYear: integer("release_year"),
    maturityRating: text("maturity_rating"),
    runtimeMinutes: integer("runtime_minutes"),
    status: text("status").notNull().default("draft"),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    logoUrl: text("logo_url"),
    accent: text("accent"),
    featured: boolean("featured").notNull().default(false),
    badge: text("badge"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_titles_published").on(table.status, table.mediaType, table.featured),
    check("titles_media_type_check", sql`${table.mediaType} in ('film', 'series')`),
    check("titles_status_check", sql`${table.status} in ('draft', 'published', 'archived')`),
  ],
);

export const genres = pgTable("genres", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const titleGenres = pgTable(
  "title_genres",
  {
    titleId: text("title_id").notNull().references(() => titles.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id").notNull().references(() => genres.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.titleId, table.genreId] }),
    index("idx_title_genres_genre").on(table.genreId, table.titleId),
  ],
);

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    titleId: text("title_id").notNull().references(() => titles.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull(),
    name: text("name"),
    synopsis: text("synopsis"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("seasons_title_number_unique").on(table.titleId, table.seasonNumber)],
);

export const episodes = pgTable(
  "episodes",
  {
    id: text("id").primaryKey(),
    seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
    episodeNumber: integer("episode_number").notNull(),
    name: text("name").notNull(),
    synopsis: text("synopsis"),
    runtimeMinutes: integer("runtime_minutes"),
    thumbnailUrl: text("thumbnail_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("episodes_season_number_unique").on(table.seasonId, table.episodeNumber)],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    titleId: text("title_id").references(() => titles.id, { onDelete: "cascade" }),
    episodeId: text("episode_id").references(() => episodes.id, { onDelete: "cascade" }),
    assetType: text("asset_type").notNull(),
    storageKey: text("storage_key"),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_media_assets_title").on(table.titleId),
    index("idx_media_assets_episode").on(table.episodeId),
  ],
);

export const videoSources = pgTable(
  "video_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mediaAssetId: uuid("media_asset_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    sourceUrl: text("source_url").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    width: integer("width"),
    height: integer("height"),
    bitrateKbps: integer("bitrate_kbps"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_video_sources_asset").on(table.mediaAssetId)],
);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const watchProgress = pgTable(
  "watch_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    titleId: text("title_id").notNull().references(() => titles.id, { onDelete: "cascade" }),
    episodeId: text("episode_id").references(() => episodes.id, { onDelete: "cascade" }),
    positionSeconds: integer("position_seconds").notNull().default(0),
    durationSeconds: integer("duration_seconds"),
    completed: boolean("completed").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_watch_progress_user").on(table.userId, table.updatedAt)],
);

export const watchHistory = pgTable(
  "watch_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    titleId: text("title_id").notNull().references(() => titles.id, { onDelete: "cascade" }),
    episodeId: text("episode_id").references(() => episodes.id, { onDelete: "cascade" }),
    watchedAt: timestamp("watched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_watch_history_user").on(table.userId, table.watchedAt)],
);

export const watchlist = pgTable(
  "watchlist",
  {
    userId: uuid("user_id").notNull(),
    titleId: text("title_id").notNull().references(() => titles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.titleId] })],
);

export const ratings = pgTable(
  "ratings",
  {
    userId: uuid("user_id").notNull(),
    titleId: text("title_id").notNull().references(() => titles.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.titleId] })],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    plan: text("plan").notNull(),
    status: text("status").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    provider: text("provider"),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_subscriptions_user").on(table.userId, table.status)],
);

export type Title = typeof titles.$inferSelect;
export type Genre = typeof genres.$inferSelect;
export type Season = typeof seasons.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type VideoSource = typeof videoSources.$inferSelect;
