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
import { featuredTitle, genreMoods, titles, type Title } from './data';
import AdminStudio from '@/pages/admin-studio';
import WatchPage from '@/pages/watch';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

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
      <img
        src={title.poster}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
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
            <div className="h-full bg-[#c4e56b]" style={{ width: `${title.progress}%` }} />
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
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#05060b]/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`${title.name} details`} data-testid="detail-overlay">
      <button type="button" aria-label="Close details" onClick={onClose} data-testid="button-close-details" className="absolute inset-0 cursor-default" />
      <div className="relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-white/10 bg-[#171822] shadow-2xl sm:rounded-2xl">
        <div className="relative h-52 overflow-hidden sm:h-72">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${title.backdrop}), ${posterFallback(title.name, title.accent)}` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#171822] via-[#171822]/20 to-transparent" />
          <button type="button" aria-label="Close title details" onClick={onClose} data-testid="button-close-details-top" className="focus-ring absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-[#0b0c14]/50 text-[#eeebda] hover:border-[#e8bc71]"><X size={16} /></button>
          <div className="absolute bottom-5 left-6 right-6 sm:left-9">
            <p className="mono mb-2 text-[9px] uppercase tracking-[.25em] text-[#c4e56b]">{title.eyebrow}</p>
            <h2 className="display text-3xl font-bold tracking-[-.04em] text-[#f3f0df] sm:text-5xl">{title.name}</h2>
          </div>
        </div>
        <div className="grid gap-7 px-6 pb-7 pt-2 sm:grid-cols-[1fr_220px] sm:px-9 sm:pb-9">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-[#b4b2bb]">
              <span className="text-[#c4e56b]">{title.rating}</span><span className="text-white/20">/</span><span>{title.year}</span><span className="text-white/20">/</span><span>{title.duration}</span>
              {title.genres.map((genre) => <span key={genre} className="rounded-full border border-white/10 px-2 py-1">{genre}</span>)}
            </div>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#b8b6be]">{title.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={onPlay} data-testid="button-detail-play" className="focus-ring flex items-center gap-2 rounded-full bg-[#eeebda] px-5 py-3 text-[11px] font-bold text-[#14151d] hover:bg-[#fffced]"><Play size={14} fill="currentColor" /> Play now</button>
              <button type="button" onClick={onToggleSaved} data-testid="button-detail-save" className="focus-ring flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-[11px] font-semibold text-[#eeebda] hover:border-[#e8bc71] hover:text-[#e8bc71]">{isSaved ? <Check size={14} /> : <Plus size={14} />} {isSaved ? 'In My List' : 'My List'}</button>
            </div>
          </div>
          <aside className="border-t border-white/10 pt-5 text-[11px] text-[#9695a2] sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0">
            <p className="mono mb-3 text-[9px] uppercase tracking-[.2em] text-[#777783]">The short read</p>
            <p className="leading-6">A carefully chosen transmission from the Cypher shelf. No autoplay. No noise. Just a good next watch.</p>
            <button type="button" onClick={() => alert('Trailer playback is coming soon.')} data-testid="button-detail-trailer" className="mt-5 flex items-center gap-2 text-[#e8bc71] hover:text-[#f4d79a]"><Volume2 size={14} /> Watch trailer <ArrowUpRight size={12} /></button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BrowseSurface() {
  const [activeSection, setActiveSection] = useState<NavKey>('home');
  const [query, setQuery] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(savedListKey) || '[]');
      return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });
  const [selectedTitle, setSelectedTitle] = useState<Title | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [, setLocation] = useLocation();
  const saved = useMemo(() => new Set(savedIds), [savedIds]);

  useEffect(() => {
    window.localStorage.setItem(savedListKey, JSON.stringify(savedIds));
  }, [savedIds]);

  const filteredTitles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return titles.filter((title) => {
      const matchesSection = activeSection === 'home' || (activeSection === 'series' && title.type === 'series') || (activeSection === 'films' && title.type === 'film') || (activeSection === 'my-list' && saved.has(title.id));
      if (!normalizedQuery) return matchesSection;
      const haystack = [title.name, title.eyebrow, title.description, ...title.genres].join(' ').toLowerCase();
      return matchesSection && haystack.includes(normalizedQuery);
    });
  }, [activeSection, query, saved]);

  const toggleSaved = (id: string) => setSavedIds((current) => current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id]);
  const openWatch = (title: Title) => setLocation(`/watch/${title.id}`);
  const selectNav = (key: NavKey) => {
    setActiveSection(key);
    setQuery('');
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const searchActive = query.trim().length > 0;
  const showHomeHero = activeSection === 'home' && !searchActive;
  const continueTitles = titles.filter((title) => title.progress);
  const newTitles = titles.filter((title) => !title.progress);

  return (
    <div className="cypher-app grain flex min-h-[100dvh]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[228px] flex-col border-r border-white/[.08] bg-[#101119]/90 px-5 py-7 backdrop-blur-xl lg:flex">
        <BrandMark />
        <div className="mt-16">
          <p className="mono mb-4 px-3 text-[9px] uppercase tracking-[.25em] text-[#676773]">Navigate</p>
          <nav className="space-y-1">
            {navItems.map((item) => <NavButton key={item.key} item={item} active={activeSection === item.key} onSelect={() => selectNav(item.key)} count={savedIds.length} />)}
          </nav>
        </div>
        <div className="mt-auto">
          <div className="mb-6 border-t border-white/[.08] pt-5">
             <Link href="/admin" data-testid="link-open-admin" className="focus-ring mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[12px] text-[#e8bc71] hover:bg-[#e8bc71]/[.06]"><Clapperboard size={16} /> Content studio <ArrowUpRight size={13} className="ml-auto" /></Link>
            <button type="button" onClick={() => alert('Cypher settings are coming soon.')} data-testid="button-settings" className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[12px] text-[#92929d] hover:bg-white/[.04] hover:text-[#eeebda]"><SlidersHorizontal size={16} /> Preferences</button>
            <button type="button" onClick={() => alert('Help center is coming soon.')} data-testid="button-help" className="focus-ring mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[12px] text-[#92929d] hover:bg-white/[.04] hover:text-[#eeebda]"><CircleHelp size={16} /> Help center</button>
          </div>
          <p className="mono px-3 text-[8px] uppercase tracking-[.17em] text-[#585864]">A private cinema for<br />public curiosities.</p>
        </div>
      </aside>

      <div className="w-full lg:pl-[228px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-white/[.07] bg-[#0b0c14]/75 px-5 backdrop-blur-xl sm:px-8 lg:px-12">
          <div className="lg:hidden"><BrandMark /></div>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="mono text-[9px] uppercase tracking-[.25em] text-[#666672]">The midnight index</span>
            <span className="h-1 w-1 rounded-full bg-[#c4e56b]" />
            <span className="mono text-[9px] tracking-[.16em] text-[#666672]">{new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <label className={`flex items-center gap-2 rounded-full border transition-all duration-300 ${searchActive ? 'w-56 border-[#e8bc71]/50 bg-white/[.05]' : 'w-9 border-transparent'} sm:w-64 sm:border-white/10 sm:bg-white/[.03]`} data-testid="label-search">
              <Search size={16} className="ml-2.5 shrink-0 text-[#92929d]" />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setMobileNavOpen(false)} placeholder="Search the index" aria-label="Search titles" data-testid="input-search" className="w-full bg-transparent py-2 pr-4 text-[11px] text-[#eeebda] outline-none placeholder:text-[#696975]" />
            </label>
            <button type="button" onClick={() => alert('No new transmissions. You are all caught up.')} aria-label="Notifications" data-testid="button-notifications" className="focus-ring relative hidden text-[#9a99a4] hover:text-[#e8bc71] sm:block"><Bell size={17} /><span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#c4e56b]" /></button>
            <button type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen((open) => !open)} data-testid="button-mobile-menu" className="focus-ring text-[#eeebda] lg:hidden"><Menu size={20} /></button>
            <div className="hidden h-8 w-8 place-items-center rounded-full bg-[#c4e56b] text-[11px] font-extrabold text-[#16171e] sm:grid">AS</div>
          </div>
        </header>

        {mobileNavOpen && (
          <div className="fixed inset-x-0 top-[72px] z-30 border-b border-white/10 bg-[#11121a] px-5 py-4 shadow-2xl lg:hidden">
            <nav className="grid grid-cols-4 gap-1">
              {navItems.map((item) => <NavButton key={item.key} item={item} active={activeSection === item.key} onSelect={() => selectNav(item.key)} count={savedIds.length} mobile />)}
            </nav>
             <Link href="/admin" onClick={() => setMobileNavOpen(false)} data-testid="link-mobile-admin" className="mt-3 flex items-center justify-center gap-2 border-t border-white/10 pt-3 text-[10px] font-semibold uppercase tracking-[.14em] text-[#e8bc71]"><Clapperboard size={14} /> Open content studio <ArrowUpRight size={13} /></Link>
          </div>
        )}

        <main className="mx-auto max-w-[1440px] px-5 pb-24 sm:px-8 lg:px-12">
          {showHomeHero && (
            <section className="reveal relative -mx-5 overflow-hidden sm:-mx-8 lg:-mx-12" data-testid="section-featured-title">
              <div className="absolute inset-0 bg-cover bg-[center_26%] sm:bg-[center_22%]" style={{ backgroundImage: `url(${featuredTitle.backdrop})` }} />
              <div className="hero-breathe absolute inset-[-3%] bg-cover bg-[center_26%] opacity-40 mix-blend-screen sm:bg-[center_22%]" style={{ backgroundImage: `url(${featuredTitle.backdrop})` }} />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c14] via-[#0b0c14]/75 to-[#0b0c14]/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c14] via-transparent to-[#0b0c14]/10" />
              <div className="relative flex min-h-[580px] items-end px-5 pb-14 pt-28 sm:min-h-[610px] sm:px-8 sm:pb-16 lg:min-h-[670px] lg:px-12 lg:pb-20">
                <div className="max-w-xl">
                  <div className="reveal-delay-1 reveal mb-6 flex items-center gap-3">
                    <span className="mono rounded-sm bg-[#c4e56b] px-2 py-1 text-[9px] font-medium uppercase tracking-[.15em] text-[#15161d]">Featured transmission</span>
                    <span className="mono text-[9px] uppercase tracking-[.18em] text-[#c4e56b]">01 / 04</span>
                  </div>
                  <p className="reveal reveal-delay-1 mono mb-3 text-[10px] uppercase tracking-[.3em] text-[#e8bc71]">{featuredTitle.eyebrow}</p>
                  <h1 className="reveal reveal-delay-2 display max-w-lg text-[clamp(3.5rem,9vw,7.8rem)] font-bold leading-[.83] tracking-[-.08em] text-[#eeebda]">{featuredTitle.name}</h1>
                  <div className="reveal reveal-delay-2 mt-6 flex flex-wrap items-center gap-3 text-[11px] text-[#c0bec4]"><span className="text-[#c4e56b]">{featuredTitle.rating}</span><span className="text-white/20">/</span><span>{featuredTitle.year}</span><span className="text-white/20">/</span><span>{featuredTitle.duration}</span>{featuredTitle.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
                  <p className="reveal reveal-delay-3 mt-5 max-w-md text-[13px] leading-6 text-[#b9b7be] sm:text-sm">{featuredTitle.description}</p>
                  <div className="reveal reveal-delay-3 mt-7 flex flex-wrap gap-3">
                    <button type="button" onClick={() => openWatch(featuredTitle)} data-testid="button-featured-play" className="focus-ring flex items-center gap-2 rounded-full bg-[#eeebda] px-6 py-3 text-[11px] font-bold text-[#14151d] transition-transform hover:scale-[1.03]"><Play size={14} fill="currentColor" /> Play now</button>
                    <button type="button" onClick={() => setSelectedTitle(featuredTitle)} data-testid="button-featured-details" className="focus-ring flex items-center gap-2 rounded-full border border-white/20 bg-[#0b0c14]/35 px-6 py-3 text-[11px] font-semibold text-[#eeebda] backdrop-blur-sm hover:border-[#e8bc71] hover:text-[#e8bc71]"><Info size={14} /> Details</button>
                  </div>
                </div>
                <div className="absolute bottom-10 right-7 hidden items-center gap-4 lg:flex">
                  <span className="mono text-[9px] uppercase tracking-[.2em] text-white/40">Scroll to explore</span>
                  <div className="h-10 w-px bg-gradient-to-b from-transparent via-[#e8bc71] to-transparent" />
                </div>
              </div>
            </section>
          )}

          {searchActive ? (
            <section className="pt-10" data-testid="section-search-results">
              <div className="mb-8 flex items-end justify-between"><div><p className="mono mb-2 text-[9px] uppercase tracking-[.25em] text-[#e8bc71]">Search results</p><h1 className="display text-3xl font-bold tracking-[-.05em] text-[#eeebda]">For “{query}”</h1></div><span className="mono text-[10px] text-[#72717d]">{filteredTitles.length} matches</span></div>
              {filteredTitles.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-6">{filteredTitles.map((title) => <PosterCard key={title.id} title={title} isSaved={saved.has(title.id)} onOpen={() => setSelectedTitle(title)} onPlay={() => openWatch(title)} onToggleSaved={() => toggleSaved(title.id)} />)}</div> : <SearchEmpty query={query} onReset={() => setQuery('')} onBrowse={() => selectNav('home')} />}
            </section>
          ) : activeSection === 'my-list' ? (
            <section className="pt-10" data-testid="section-my-list">
              <div className="mb-2"><p className="mono mb-2 text-[9px] uppercase tracking-[.25em] text-[#c4e56b]">Saved for later</p><h1 className="display text-4xl font-bold tracking-[-.06em] text-[#eeebda]">My List</h1></div>
              <p className="mb-8 text-sm text-[#85848f]">{savedIds.length ? `${savedIds.length} title${savedIds.length === 1 ? '' : 's'} in your private index.` : 'A quiet place for your next great watch.'}</p>
              {filteredTitles.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-6">{filteredTitles.map((title) => <PosterCard key={title.id} title={title} isSaved={saved.has(title.id)} onOpen={() => setSelectedTitle(title)} onPlay={() => openWatch(title)} onToggleSaved={() => toggleSaved(title.id)} />)}</div> : <MyListEmpty onBrowse={() => selectNav('home')} />}
            </section>
          ) : (
            <>
              {!showHomeHero && <div className="reveal flex items-end justify-between pt-11"><div><p className="mono mb-2 text-[9px] uppercase tracking-[.25em] text-[#e8bc71]">The index</p><h1 className="display text-4xl font-bold tracking-[-.06em] text-[#eeebda]">{activeSection === 'series' ? 'Series, in full signal.' : 'Films worth staying up for.'}</h1></div><span className="mono hidden text-[10px] text-[#72717d] sm:block">{filteredTitles.length} transmissions</span></div>}
               {showHomeHero && <TitleRow label="Pick up where you left off" kicker="Continue watching" items={continueTitles} saved={saved} onOpen={setSelectedTitle} onPlay={openWatch} onToggleSaved={toggleSaved} />}
               <TitleRow label={activeSection === 'home' ? 'Tonight’s signal' : activeSection === 'series' ? 'Series with a point of view' : 'The long way around'} kicker={activeSection === 'home' ? 'Curated this week' : undefined} items={filteredTitles.filter((title) => !continueTitles.includes(title)).slice(0, 6)} saved={saved} onOpen={setSelectedTitle} onPlay={openWatch} onToggleSaved={toggleSaved} />
              {showHomeHero && <GenreGrid onGenre={(genre) => setQuery(genre)} />}
               <TitleRow label="Further transmissions" kicker="A little off-center" items={newTitles.filter((title) => filteredTitles.includes(title))} saved={saved} onOpen={setSelectedTitle} onPlay={openWatch} onToggleSaved={toggleSaved} />
              {showHomeHero && <div className="reveal mt-16 border-y border-white/[.08] py-8 sm:flex sm:items-center sm:justify-between" data-testid="section-membership-note"><div><p className="mono mb-2 text-[9px] uppercase tracking-[.25em] text-[#e8bc71]">The Cypher promise</p><p className="display text-xl font-bold tracking-[-.03em] text-[#eeebda]">Less noise. More afterglow.</p></div><p className="mt-3 max-w-sm text-xs leading-5 text-[#85848f] sm:mt-0">A human-shaped catalogue of films and series for the beautifully curious. We add a small batch every Thursday.</p><button type="button" onClick={() => alert('You are already on the list.')} data-testid="button-join-cypher" className="focus-ring mt-5 flex shrink-0 items-center gap-2 text-[11px] font-bold text-[#c4e56b] sm:mt-0">Stay in the loop <ArrowUpRight size={14} /></button></div>}
            </>
          )}
        </main>

        <footer className="border-t border-white/[.07] px-5 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 text-[10px] text-[#676773] sm:flex-row sm:items-center">
            <p className="mono tracking-[.13em]">CYPHER STREAM © 2025 / MADE FOR CURIOUS VIEWERS</p>
            <div className="flex gap-5"><button type="button" onClick={() => alert('Privacy details are coming soon.')} data-testid="button-privacy" className="hover:text-[#e8bc71]">Privacy</button><button type="button" onClick={() => alert('Terms details are coming soon.')} data-testid="button-terms" className="hover:text-[#e8bc71]">Terms</button><span className="mono text-[#c4e56b]">24° 03′ N / 73° 01′ W</span></div>
          </div>
        </footer>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-2xl border border-white/10 bg-[#151620]/90 py-2 backdrop-blur-xl lg:hidden" data-testid="nav-mobile-bottom">
        {navItems.map((item) => <NavButton key={item.key} item={item} active={activeSection === item.key} onSelect={() => selectNav(item.key)} count={savedIds.length} mobile />)}
      </nav>
      {selectedTitle && <DetailPanel title={selectedTitle} isSaved={saved.has(selectedTitle.id)} onClose={() => setSelectedTitle(null)} onPlay={() => openWatch(selectedTitle)} onToggleSaved={() => toggleSaved(selectedTitle.id)} />}
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/admin" component={AdminStudio} />
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