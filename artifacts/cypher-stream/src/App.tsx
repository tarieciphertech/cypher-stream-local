import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clapperboard,
  Home,
  Info,
  Menu,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tv,
  Volume2,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { genreMoods, type Title } from './data';
import AdminStudio from '@/pages/admin-studio';
import WatchPage from '@/pages/watch';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, useRoute, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
type NavKey = 'home' | 'series' | 'films' | 'my-list';

const navItems: { key: NavKey; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'series', label: 'Series', icon: Tv },
  { key: 'films', label: 'Films', icon: Clapperboard },
  { key: 'my-list', label: 'My List', icon: Bookmark },
];

const posterFallback = (title: string, accent: string) =>
  `linear-gradient(145deg, ${accent} 0%, #171822 65%, #0b0c14 100%)`;
const savedListKey = 'cypher-saved-titles';

type CatalogGenre = { id: string; slug: string; name: string };
type CatalogTitle = {
  id: string;
  slug: string;
  name: string;
  synopsis: string | null;
  mediaType: 'film' | 'series';
  releaseYear: number | null;
  maturityRating: string | null;
  runtimeMinutes: number | null;
  status: 'draft' | 'published' | 'archived';
  posterUrl: string | null;
  backdropUrl: string | null;
  logoUrl: string | null;
  accent: string | null;
  featured: boolean;
  badge: string | null;
  genres: CatalogGenre[];
  sourceUrl: string | null;
};

const formatDuration = (minutes: number | null, type: Title['type']) => {
  if (!minutes) return type === 'series' ? 'Series' : 'Runtime unavailable';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours}h ${remaining}m` : `${remaining}m`;
};

const readLocalPlaybackState = (titleId: string) => {
  if (typeof window === 'undefined') return { progress: 0, active: false };
  const prefix = `cypher-playback-${titleId}-`;
  let highestActiveProgress = 0;
  let active = false;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const value = Number(window.localStorage.getItem(key));
    if (!Number.isFinite(value)) continue;

    const normalized = Math.min(100, Math.max(0, value));
    if (normalized < 100) {
      active = true;
      highestActiveProgress = Math.max(highestActiveProgress, normalized);
    }
  }

  return {
    progress: highestActiveProgress > 0 ? Math.round(highestActiveProgress * 10) / 10 : 0,
    active,
  };
};

const readLocalProgress = (titleId: string) => readLocalPlaybackState(titleId).progress;
const hasLocalPlayback = (titleId: string) => readLocalPlaybackState(titleId).active;

const catalogToTitle = (item: CatalogTitle): Title => ({
  id: item.id,
  name: item.name,
  eyebrow: item.mediaType === 'series' ? 'Cypher Series' : 'Cypher Film',
  year: item.releaseYear ?? new Date().getFullYear(),
  rating: item.maturityRating ?? 'NR',
  duration: formatDuration(item.runtimeMinutes, item.mediaType),
  type: item.mediaType,
  genres: item.genres.map((genre) => genre.name),
  description: item.synopsis || 'A transmission from the local Cypher catalogue.',
  poster: item.posterUrl || '',
  backdrop: item.backdropUrl || '',
  accent: item.accent || '#e8bc71',
  slug: item.slug,
  playbackSource: item.sourceUrl || undefined,
  progress: readLocalProgress(item.id),
  hasLocalPlayback: hasLocalPlayback(item.id),
  badge: item.badge || undefined,
});

function BrandMark() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-cypher-stream">
      <div className="relative grid h-9 w-9 place-items-center rounded-full border border-[#e8bc71]/70 text-[#e8bc71]">
        <span className="absolute h-5 w-5 rounded-full border border-dashed border-[#e8bc71]/60" />
        <span className="mono text-[10px] font-medium tracking-[-.08em]">C/</span>
      </div>
      <div className="leading-none">
        <p className="display text-[15px] font-bold tracking-[.18em] text-[#eeebda]">CYPHER</p>
        <p className="mono mt-1 text-[8px] tracking-[.36em] text-[#9695a2]">STREAM / 01</p>
      </div>
    </div>
  );
}

function NavButton({
  item,
  active,
  onSelect,
  count,
  mobile = false,
}: {
  item: (typeof navItems)[number];
  active: boolean;
  onSelect: () => void;
  count: number;
  mobile?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      onClick={onSelect}
      data-testid={`button-nav-${item.key}`}
      className={`focus-ring group relative flex items-center transition-all duration-300 ${
        mobile
          ? `flex-col gap-1.5 px-4 py-2 text-[10px] ${active ? 'text-[#e8bc71]' : 'text-[#7f7f8c]'}`
          : `w-full gap-3 rounded-xl px-3 py-3 text-left text-[12px] ${active ? 'bg-[#e8bc71]/10 text-[#e8bc71]' : 'text-[#92929d] hover:bg-white/[.04] hover:text-[#eeebda]'}`
      }`}
    >
      <Icon size={mobile ? 18 : 16} strokeWidth={active ? 2.2 : 1.7} />
      <span className={mobile ? '' : 'flex-1'}>{item.label}</span>
      {!mobile && item.key === 'my-list' && count > 0 && (
        <span className="mono rounded-full bg-[#c4e56b]/15 px-1.5 py-0.5 text-[9px] text-[#c4e56b]" data-testid="text-my-list-count">
          {count}
        </span>
      )}
      {mobile && active && <span className="absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-[#e8bc71]" />}
    </button>
  );
}

function ImageCover({ title, className = '' }: { title: Title; className?: string }) {
  return (
    <div
      className={`absolute inset-0 bg-cover bg-center ${className}`}
      style={{ backgroundImage: posterFallback(title.name, title.accent) }}
    >
      {title.poster && (
        <img
          src={title.poster}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}

function PosterCard({
  title,
  isSaved,
  onOpen,
  onPlay,
  onToggleSaved,
}: {
  title: Title;
  isSaved: boolean;
  onOpen: () => void;
  onPlay: () => void;
  onToggleSaved: () => void;
}) {
  return (
    <article className="title-card group min-w-[148px] max-w-[148px] flex-1 sm:min-w-[172px] sm:max-w-[172px]" data-testid={`card-title-${title.id}`}>
      <div className="sheen relative aspect-[2/3] overflow-hidden rounded-[5px] bg-[#20212b] shadow-[0_12px_30px_rgba(0,0,0,.25)]">
        <button type="button" aria-label={`Open ${title.name}`} onClick={onOpen} data-testid={`button-open-${title.id}`} className="focus-ring absolute inset-0 z-10">
          <span className="sr-only">Open {title.name}</span>
        </button>
        <ImageCover title={title} className="card-image" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#090a10] via-[#090a10]/50 to-transparent" />
        {title.badge && (
          <span className="absolute left-2.5 top-2.5 rounded-sm bg-[#e8bc71] px-2 py-1 text-[8px] font-extrabold uppercase tracking-[.12em] text-[#17120c]">
            {title.progress ? `${title.progress}% through` : 'New'}
          </span>
        )}
        <div className="card-actions absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center gap-1.5">
          <button
            type="button"
            aria-label={`Play ${title.name}`}
            onClick={onPlay}
            data-testid={`button-play-${title.id}`}
            className="focus-ring grid h-8 w-8 place-items-center rounded-full bg-[#eeebda] text-[#101118] transition-transform hover:scale-105"
          >
            <Play size={13} fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label={isSaved ? `Remove ${title.name} from My List` : `Add ${title.name} to My List`}
            onClick={onToggleSaved}
            data-testid={`button-save-${title.id}`}
            className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-white/30 bg-[#11121a]/80 text-[#eeebda] transition-colors hover:border-[#e8bc71] hover:text-[#e8bc71]"
          >
            {isSaved ? <Check size={14} /> : <Plus size={14} />}
          </button>
          <button type="button" aria-label={`More information about ${title.name}`} onClick={onOpen} data-testid={`button-info-${title.id}`} className="focus-ring ml-auto grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-[#11121a]/70 text-[#eeebda] hover:border-white/60">
            <Info size={14} />
          </button>
        </div>
        {title.progress && (
          <div className="absolute bottom-0 left-0 right-0 z-10 h-1 bg-white/20">
            <div className="h-full bg-[#c4e56b]" style={{ width: `${title.progress ?? 0}%` }} />
          </div>
        )}
      </div>
      <button type="button" onClick={onOpen} data-testid={`button-title-label-${title.id}`} className="focus-ring mt-3 block text-left">
        <p className="truncate text-[12px] font-semibold text-[#eeebda] transition-colors group-hover:text-[#e8bc71]">{title.name}</p>
        <p className="mono mt-1 truncate text-[9px] uppercase tracking-[.12em] text-[#777783]">{title.eyebrow}</p>
      </button>
    </article>
  );
}

function TitleRow({
  label,
  kicker,
  items,
  saved,
  onOpen,
  onPlay,
  onToggleSaved,
}: {
  label: string;
  kicker?: string;
  items: Title[];
  saved: Set<string>;
  onOpen: (title: Title) => void;
  onPlay: (title: Title) => void;
  onToggleSaved: (id: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const canBack = offset > 0;
  const canForward = offset < Math.max(0, items.length - 5);
  const visible = items.slice(offset, offset + 6);
  if (!items.length) return null;
  return (
    <section className="reveal relative mt-11" data-testid={`section-row-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="mb-4 flex items-end justify-between">
        <div>
          {kicker && <p className="mono mb-2 text-[9px] uppercase tracking-[.24em] text-[#c4e56b]">{kicker}</p>}
          <h2 className="display text-[21px] font-bold tracking-[-.03em] text-[#eeebda] sm:text-[24px]">{label}</h2>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <button type="button" disabled={!canBack} onClick={() => setOffset(Math.max(0, offset - 1))} data-testid={`button-previous-${label}`} className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-white/10 text-[#aaa9b0] transition-colors hover:border-[#e8bc71] hover:text-[#e8bc71] disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft size={15} /></button>
          <button type="button" disabled={!canForward} onClick={() => setOffset(offset + 1)} data-testid={`button-next-${label}`} className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-white/10 text-[#aaa9b0] transition-colors hover:border-[#e8bc71] hover:text-[#e8bc71] disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight size={15} /></button>
        </div>
      </div>
      <div className="scrollbar-none flex gap-3 overflow-x-auto pb-3 sm:gap-4">
        {visible.map((title) => (
          <PosterCard key={title.id} title={title} isSaved={saved.has(title.id)} onOpen={() => onOpen(title)} onPlay={() => onPlay(title)} onToggleSaved={() => onToggleSaved(title.id)} />
        ))}
      </div>
    </section>
  );
}

function GenreGrid({ onGenre }: { onGenre: (genre: string) => void }) {
  return (
    <section className="reveal reveal-delay-2 mt-14" data-testid="section-genre-exploration">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="mono mb-2 text-[9px] uppercase tracking-[.24em] text-[#c4e56b]">Browse by feeling</p>
          <h2 className="display text-[21px] font-bold tracking-[-.03em] text-[#eeebda] sm:text-[24px]">Find your frequency</h2>
        </div>
        <Sparkles size={18} className="mb-1 text-[#e8bc71]" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {genreMoods.map((genre) => (
          <button
            key={genre.name}
            type="button"
            onClick={() => onGenre(genre.name)}
            data-testid={`button-genre-${genre.name.toLowerCase().replaceAll(' ', '-')}`}
            className="sheen focus-ring group relative aspect-[1.48] overflow-hidden rounded-md border border-white/[.08] text-left"
            style={{ backgroundColor: genre.color }}
          >
            <img src={genre.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-luminosity transition-all duration-500 group-hover:scale-105 group-hover:opacity-70" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090a10]/90 via-[#090a10]/10 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <p className="display text-[15px] font-bold text-[#f2efdc]">{genre.name}</p>
              <p className="mono mt-1 text-[9px] uppercase tracking-[.1em] text-white/60">{genre.count} titles</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function SearchEmpty({ query, onReset, onBrowse }: { query: string; onReset: () => void; onBrowse: () => void }) {
  return (
    <div className="reveal flex min-h-[56vh] flex-col items-center justify-center px-5 text-center" data-testid="empty-search-state">
      <div className="relative mb-7 grid h-24 w-24 place-items-center rounded-full border border-[#e8bc71]/30 text-[#e8bc71]">
        <div className="absolute inset-2 rounded-full border border-dashed border-[#e8bc71]/30" />
        <Search size={26} strokeWidth={1.3} />
      </div>
      <p className="mono mb-3 text-[10px] uppercase tracking-[.28em] text-[#e8bc71]">Signal not found</p>
      <h2 className="display max-w-md text-3xl font-bold tracking-[-.04em] text-[#eeebda] sm:text-4xl">Nothing in the dark for “{query}”</h2>
      <p className="mt-4 max-w-sm text-sm leading-6 text-[#9695a2]">Try a director, a mood, or something less specific. The index rewards curiosity.</p>
      <div className="mt-7 flex gap-3">
        <button type="button" onClick={onReset} data-testid="button-clear-search" className="focus-ring rounded-full bg-[#eeebda] px-5 py-2.5 text-[11px] font-bold text-[#14151d] transition-transform hover:scale-[1.03]">Clear search</button>
        <button type="button" onClick={onBrowse} data-testid="button-browse-all" className="focus-ring rounded-full border border-white/15 px-5 py-2.5 text-[11px] font-semibold text-[#eeebda] hover:border-[#e8bc71] hover:text-[#e8bc71]">Browse all</button>
      </div>
    </div>
  );
}

function MyListEmpty({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="reveal relative flex min-h-[56vh] flex-col items-center justify-center overflow-hidden px-5 text-center" data-testid="empty-my-list-state">
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e8bc71]/[.04] blur-3xl" />
      <div className="relative mb-7 grid h-24 w-24 place-items-center rounded-full border border-[#c4e56b]/30 text-[#c4e56b]">
        <Bookmark size={27} strokeWidth={1.2} />
        <span className="absolute -right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-[#c4e56b] text-[#101118]"><Plus size={13} /></span>
      </div>
      <p className="mono mb-3 text-[10px] uppercase tracking-[.28em] text-[#c4e56b]">Your private index</p>
      <h2 className="display max-w-md text-3xl font-bold tracking-[-.04em] text-[#eeebda] sm:text-4xl">Keep the good ones close.</h2>
      <p className="mt-4 max-w-sm text-sm leading-6 text-[#9695a2]">Save films and series here when you are not ready to let them disappear into the night.</p>
      <button type="button" onClick={onBrowse} data-testid="button-discover-titles" className="focus-ring mt-7 rounded-full bg-[#e8bc71] px-5 py-2.5 text-[11px] font-bold text-[#14151d] transition-transform hover:scale-[1.03]">Discover something</button>
    </div>
  );
}

function DetailPanel({ title, isSaved, onClose, onPlay, onToggleSaved }: { title: Title; isSaved: boolean; onClose: () => void; onPlay: () => void; onToggleSaved: () => void }) {
  const progress = title?.progress ?? 0;
  const canonical = title ? `/title/${title.slug || title.id}` : '';

  useEffect(() => {
    if (!title) return;
    document.title = `${title.name} — Cypher Stream`;
    const description = title.description;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = description;

    const upsert = (property: string, content: string) => {
      let node = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!node) { node = document.createElement('meta'); node.setAttribute('property', property); document.head.appendChild(node); }
      node.content = content;
    };
    upsert('og:title', title.name);
    upsert('og:description', description);
    upsert('og:type', title.type === 'series' ? 'video.tv_show' : 'video.movie');
    if (title.poster) upsert('og:image', title.poster);

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = window.location.origin + canonical;

    document.head.querySelectorAll('script[data-cypher-title="true"]').forEach((node) => node.remove());
    const jsonLd = document.createElement('script');
    jsonLd.type = 'application/ld+json';
    jsonLd.dataset.cypherTitle = 'true';
    jsonLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': title.type === 'series' ? 'TVSeries' : 'Movie',
      name: title.name,
      description,
      image: title.poster ? [title.poster] : undefined,
      dateCreated: String(title.year),
      genre: title.genres,
      url: window.location.origin + canonical,
    });
    document.head.appendChild(jsonLd);
    return () => {
      document.head.querySelectorAll('script[data-cypher-title="true"]').forEach((node) => node.remove());
    };
  }, [title, canonical]);
  const play = () => setLocation(`/watch/${title.id}`);

  return (
    <div className="cypher-app grain min-h-[100dvh]">
      <header className="title-page-header">
        <button type="button" onClick={() => window.history.length > 1 ? window.history.back() : setLocation('/')} className="focus-ring title-page-back"><ChevronLeft size={16} /> Back</button>
        <BrandMark />
        <Link href="/" className="mono title-page-home">Browse index <ArrowUpRight size={12} /></Link>
      </header>
      <main className="title-page">
        <section className="title-page-hero">
          <div className="title-page-art" style={{ backgroundImage: title.backdrop ? `url(${title.backdrop}), ${posterFallback(title.name, title.accent)}` : posterFallback(title.name, title.accent) }} />
          <div className="title-page-overlay" />
          <div className="title-page-copy">
            <p className="mono detail-kicker">{title.type === 'series' ? 'Series transmission' : 'Feature transmission'}</p>
            <h1 className="display title-page-name">{title.name}</h1>
            <div className="detail-meta"><span className="detail-signal">{title.rating}</span><span>{title.year}</span><span>{title.duration}</span>{title.genres.slice(0, 4).map((genre) => <span key={genre}>{genre}</span>)}</div>
            <p className="title-page-description">{title.description}</p>
            <div className="detail-actions">
              <button type="button" onClick={play} className="focus-ring detail-play"><Play size={14} fill="currentColor" /> {progress > 0 ? 'Resume' : 'Play now'}</button>
              <button type="button" onClick={toggleSaved} className="focus-ring detail-save">{saved ? <Check size={14} /> : <Plus size={14} />} {saved ? 'In My List' : 'My List'}</button>
            </div>
          </div>
        </section>
        <section className="title-page-content">
          <div className="title-page-poster"><ImageCover title={title} /></div>
          <div className="title-page-info">
            <p className="mono title-page-label">Local catalogue / {title.type === 'series' ? 'Series' : 'Film'}</p>
            <h2 className="display">About this transmission</h2>
            <p>{title.description}</p>
            {progress > 0 && <div className="detail-progress"><span style={{ width: `${progress}%` }} /></div>}
            <div className="title-page-facts"><span>{title.genres.join(' · ')}</span><span>{title.type === 'series' ? 'Multiple seasons' : 'Feature film'}</span><span>Available locally</span></div>
          </div>
        </section>
        {title.type === 'series' && seasons.length > 0 && (
          <section className="title-page-seasons">
            <div className="title-page-section-heading"><div><p className="mono title-page-label">Episode index</p><h2 className="display">Seasons & episodes</h2></div><span className="mono">{seasons.length} seasons</span></div>
            <div className="title-page-season-grid">
              {seasons.map((season) => (
                <div key={season.id} className="title-page-season">
                  <div className="title-page-season-heading"><span>Season {String(season.seasonNumber).padStart(2, '0')}</span><small>{season.episodes.length} episodes</small></div>
                  <div className="title-page-episodes">
                    {season.episodes.map((episode) => (
                      <button key={episode.id} type="button" onClick={() => setLocation(`/watch/${title.id}?episode=${episode.id}`)} className="focus-ring title-page-episode" disabled={!episode.sourceUrl}>
                        <span>E{String(episode.episodeNumber).padStart(2, '0')}</span><strong>{episode.name}</strong><ArrowUpRight size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/admin" component={AdminStudio} />
        <Route path="/title/:slug" component={TitleDetailPage} />
        <Route path="/watch/:id" component={WatchPage} />
        <Route path="/" component={BrowseSurface} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;