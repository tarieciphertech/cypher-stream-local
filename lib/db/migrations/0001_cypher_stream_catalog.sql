create table if not exists public.titles (
  id text primary key,
  slug text not null unique,
  name text not null,
  synopsis text,
  media_type text not null check (media_type in ('film', 'series')),
  release_year integer check (release_year between 1888 and 2100),
  maturity_rating text,
  runtime_minutes integer check (runtime_minutes is null or runtime_minutes > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  poster_url text,
  backdrop_url text,
  logo_url text,
  accent text,
  featured boolean not null default false,
  badge text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.title_genres (
  title_id text not null references public.titles(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  primary key (title_id, genre_id)
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  title_id text not null references public.titles(id) on delete cascade,
  season_number integer not null check (season_number > 0),
  name text,
  synopsis text,
  created_at timestamptz not null default now(),
  unique (title_id, season_number)
);

create table if not exists public.episodes (
  id text primary key,
  season_id uuid not null references public.seasons(id) on delete cascade,
  episode_number integer not null check (episode_number > 0),
  name text not null,
  synopsis text,
  runtime_minutes integer check (runtime_minutes is null or runtime_minutes > 0),
  thumbnail_url text,
  created_at timestamptz not null default now(),
  unique (season_id, episode_number)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title_id text references public.titles(id) on delete cascade,
  episode_id text references public.episodes(id) on delete cascade,
  asset_type text not null check (asset_type in ('poster', 'backdrop', 'logo', 'thumbnail', 'video', 'subtitle', 'other')),
  storage_key text,
  mime_type text,
  width integer,
  height integer,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  check (title_id is not null or episode_id is not null)
);

create table if not exists public.video_sources (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  source_type text not null check (source_type in ('mp4', 'hls', 'dash')),
  source_url text not null,
  is_default boolean not null default false,
  width integer,
  height integer,
  bitrate_kbps integer,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null references public.titles(id) on delete cascade,
  episode_id text references public.episodes(id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, title_id, episode_id)
);

create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null references public.titles(id) on delete cascade,
  episode_id text references public.episodes(id) on delete cascade,
  watched_at timestamptz not null default now()
);

create table if not exists public.watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null references public.titles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table if not exists public.ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null references public.titles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null,
  status text not null check (status in ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_titles_published on public.titles (status, media_type, featured);
create index if not exists idx_title_genres_genre on public.title_genres (genre_id, title_id);
create index if not exists idx_seasons_title on public.seasons (title_id, season_number);
create index if not exists idx_episodes_season on public.episodes (season_id, episode_number);
create index if not exists idx_media_assets_title on public.media_assets (title_id);
create index if not exists idx_media_assets_episode on public.media_assets (episode_id);
create index if not exists idx_video_sources_asset on public.video_sources (media_asset_id);
create index if not exists idx_watch_progress_user on public.watch_progress (user_id, updated_at desc);
create index if not exists idx_watch_history_user on public.watch_history (user_id, watched_at desc);
create index if not exists idx_watchlist_user on public.watchlist (user_id, created_at desc);
create index if not exists idx_ratings_title on public.ratings (title_id);
create index if not exists idx_subscriptions_user on public.subscriptions (user_id, status);

alter table public.titles enable row level security;
alter table public.genres enable row level security;
alter table public.title_genres enable row level security;
alter table public.seasons enable row level security;
alter table public.episodes enable row level security;
alter table public.media_assets enable row level security;
alter table public.video_sources enable row level security;
alter table public.profiles enable row level security;
alter table public.watch_progress enable row level security;
alter table public.watch_history enable row level security;
alter table public.watchlist enable row level security;
alter table public.ratings enable row level security;
alter table public.subscriptions enable row level security;
