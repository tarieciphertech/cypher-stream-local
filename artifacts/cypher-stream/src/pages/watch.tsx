import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { ArrowLeft, Bookmark, Check, Clapperboard, Film, ListVideo, Play, Radio } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { prototypeVideoSources, titles, type Episode, type Title } from '../data';

const posterFallback = (title: Title) => `linear-gradient(145deg, ${title.accent} 0%, #171822 62%, #080a11 100%)`;
const progressKey = (id: string) => `cypher-playback-${id}`;
const savedKey = (id: string) => `cypher-saved-${id}`;
const savedListKey = 'cypher-saved-titles';

const fallbackEpisodes = (title: Title): Episode[] => [
  { id: `${title.id}-episode-1`, label: 'Episode 01 / The opening signal', source: prototypeVideoSources[0] },
  { id: `${title.id}-episode-2`, label: 'Episode 02 / A room with no doors', source: prototypeVideoSources[1] },
  { id: `${title.id}-episode-3`, label: 'Episode 03 / The shape of a secret', source: prototypeVideoSources[2] },
];

function ScreeningSkeleton() {
  return (
    <div className="watch-shell grain" data-testid="loading-watch-page">
      <div className="watch-content">
        <header className="watch-topbar"><span className="watch-back-link">Returning to the screening room</span></header>
        <div className="watch-skeleton">
          <div className="watch-skeleton-line" />
          <div className="watch-skeleton-line watch-skeleton-title" />
          <div className="watch-skeleton-player" />
        </div>
      </div>
    </div>
  );
}

function UnknownTransmission() {
  return (
    <div className="watch-shell grain" data-testid="empty-watch-state">
      <div className="watch-content">
        <header className="watch-topbar">
          <Link href="/" className="watch-back-link focus-ring" data-testid="link-back-unknown"><ArrowLeft size={15} /> Back to cinema</Link>
          <div className="watch-top-meta"><span className="watch-signal" /> Private index</div>
        </header>
        <main className="watch-unknown">
          <div>
            <div className="watch-unknown-mark"><Radio size={26} strokeWidth={1.3} /></div>
            <p className="watch-kicker mt-6">Transmission unavailable</p>
            <h1>This shelf is empty.</h1>
            <p>The title you were looking for has moved off the index, or its signal was never catalogued.</p>
            <Link href="/" className="watch-action-primary focus-ring mt-7" data-testid="link-browse-from-unknown"><ArrowLeft size={14} /> Return to the shelf</Link>
          </div>
        </main>
      </div>
    </div>
  );
}

function RelatedPoster({ title }: { title: Title }) {
  return (
    <div className="watch-related-poster" style={{ backgroundImage: posterFallback(title) }}>
      {title.poster && <img src={title.poster} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
    </div>
  );
}

export default function WatchPage() {
  const params = useParams<{ id?: string }>();
  const [isResolving, setIsResolving] = useState(true);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const title = useMemo(() => titles.find((item) => item.id === params.id), [params.id]);
  const episodes = useMemo(() => title?.type === 'series' ? title.episodes?.length ? title.episodes : fallbackEpisodes(title) : [], [title]);
  const selectedEpisode = episodes.find((episode) => episode.id === selectedEpisodeId) || episodes[0];
  const source = selectedEpisode?.source || title?.playbackSource || prototypeVideoSources[title ? title.id.length % prototypeVideoSources.length : 0];
  const relatedTitles = useMemo(() => title ? titles.filter((item) => item.id !== title.id && item.genres.some((genre) => title.genres.includes(genre))).slice(0, 4) : [], [title]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsResolving(false));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!title) return;
    setIsSaved(window.localStorage.getItem(savedKey(title.id)) === 'true');
    const stored = Number(window.localStorage.getItem(progressKey(title.id)));
    setProgress(Number.isFinite(stored) ? Math.min(100, Math.max(0, stored)) : 0);
    setPlaybackError(false);
  }, [title]);

  useEffect(() => {
    if (!title || !selectedEpisode) return;
    setPlaybackError(false);
  }, [title, selectedEpisode]);

  if (isResolving) return <ScreeningSkeleton />;
  if (!title) return <UnknownTransmission />;

  const toggleSaved = () => {
    setIsSaved((current) => {
      const next = !current;
      window.localStorage.setItem(savedKey(title.id), String(next));
      const savedIds = JSON.parse(window.localStorage.getItem(savedListKey) || '[]') as unknown;
      const nextIds = Array.isArray(savedIds) ? savedIds.filter((id): id is string => typeof id === 'string' && id !== title.id) : [];
      if (next) nextIds.push(title.id);
      window.localStorage.setItem(savedListKey, JSON.stringify(nextIds));
      return next;
    });
  };

  const restoreProgress = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const stored = Number(window.localStorage.getItem(progressKey(title.id)));
    if (Number.isFinite(stored) && stored > 0 && stored < 100 && video.duration) {
      video.currentTime = video.duration * (stored / 100);
    }
  };

  const handleTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const next = Math.round((video.currentTime / video.duration) * 1000) / 10;
    setProgress(next);
    window.localStorage.setItem(progressKey(title.id), String(next));
  };

  const playFromCurrentPosition = () => {
    void videoRef.current?.play().catch(() => undefined);
  };

  return (
    <div className="watch-shell grain" data-testid={`page-watch-${title.id}`}>
      <div className="watch-backdrop" style={{ backgroundImage: `${title.backdrop ? `url(${title.backdrop}), ` : ''}${posterFallback(title)}` }} />
      <div className="watch-content">
        <header className="watch-topbar">
          <Link href="/" className="watch-back-link focus-ring" data-testid="link-back-to-cinema"><ArrowLeft size={15} /> Back to cinema</Link>
          <div className="watch-top-meta"><span className="watch-signal" /> Screening room <span>/</span> Prototype playback</div>
          <Link href="/" className="hidden text-[#aaa8b2] transition-colors hover:text-[#e8bc71] sm:block" aria-label="Return to browse" data-testid="link-watch-brand"><Clapperboard size={17} /></Link>
        </header>

        <main className="watch-stage">
          <section className="watch-heading reveal">
            <div>
              <p className="watch-kicker" data-testid="text-watch-kicker">{title.eyebrow}</p>
              <h1 data-testid="text-watch-title">{title.name}</h1>
            </div>
            <p className="watch-heading-note">A focused transmission<br />from the midnight index</p>
          </section>

          <section className="watch-player-frame reveal reveal-delay-1" aria-label={`${title.name} video player`}>
            <video
              key={`${title.id}-${selectedEpisode?.id || 'feature'}`}
              ref={videoRef}
              className="watch-player"
              controls
              playsInline
              preload="metadata"
              poster={title.poster || undefined}
              src={source}
              onLoadedMetadata={restoreProgress}
              onTimeUpdate={handleTimeUpdate}
              onError={() => setPlaybackError(true)}
              data-testid="video-player"
            />
            <div className="watch-player-caption">
              <span><strong>Preview stream</strong> / {selectedEpisode?.label || 'Selected feature presentation'}</span>
              <span data-testid="text-watch-progress">{progress.toFixed(1)}% saved</span>
            </div>
          </section>

          {playbackError && (
            <p className="watch-error-note" role="status" data-testid="status-playback-error">
              This prototype stream is temporarily unavailable. Try another transmission from the shelf; your saved progress is kept locally.
            </p>
          )}

          <section className="watch-detail-grid reveal reveal-delay-2">
            <div>
              <div className="watch-meta-line" data-testid="text-watch-metadata">
                <span className="watch-rating">{title.rating}</span>
                <span className="watch-meta-separator">/</span>
                <span>{title.type === 'film' ? 'Film' : 'Series'}</span>
                <span className="watch-meta-separator">/</span>
                <span>{title.year}</span>
                <span className="watch-meta-separator">/</span>
                <span>{selectedEpisode ? selectedEpisode.duration || title.duration : title.duration}</span>
                {title.genres.map((genre) => <span className="watch-genre" key={genre}>{genre}</span>)}
              </div>
              <p className="watch-description" data-testid="text-watch-description">{title.description}</p>
              <div className="watch-action-row">
                <button type="button" onClick={playFromCurrentPosition} className="watch-action-primary focus-ring" data-testid="button-watch-play"><Play size={14} fill="currentColor" /> {progress > 0 && progress < 98 ? 'Resume transmission' : 'Play transmission'}</button>
                <button type="button" onClick={toggleSaved} className="watch-action-secondary focus-ring" aria-pressed={isSaved} data-testid="button-watch-my-list">{isSaved ? <Check size={14} /> : <Bookmark size={14} />} {isSaved ? 'In My List' : 'My List'}</button>
              </div>
            </div>

            <aside className="watch-side-card" aria-label="Screening information">
              <p className="watch-kicker">The screening note</p>
              <p className="watch-side-copy">Prototype playback only. These sample clips are used to shape the room while the catalogue is being prepared.</p>
              {title.type === 'series' ? (
                <div className="mt-6">
                  <div className="flex items-center gap-2"><ListVideo size={14} className="text-[#c4e56b]" /><h2>Choose an episode</h2></div>
                  <div className="watch-episode-list" role="listbox" aria-label="Episodes">
                    {episodes.map((episode, index) => (
                      <button
                        key={episode.id}
                        type="button"
                        role="option"
                        aria-selected={selectedEpisode?.id === episode.id}
                        onClick={() => setSelectedEpisodeId(episode.id)}
                        className={`watch-episode focus-ring ${selectedEpisode?.id === episode.id ? 'watch-episode-active' : ''}`}
                        data-testid={`button-episode-${index + 1}`}
                      >
                        <span>{episode.label}</span><small>{selectedEpisode?.id === episode.id ? 'NOW' : `0${index + 1}`}</small>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex items-center gap-2 text-[10px] text-[#aaa8b2]" data-testid="text-feature-state"><Film size={14} className="text-[#c4e56b]" /> Selected feature presentation</div>
              )}
            </aside>
          </section>

          <section className="watch-related reveal reveal-delay-3" aria-labelledby="related-heading">
            <div className="watch-related-heading">
              <div><p className="watch-kicker">After this signal</p><h2 id="related-heading">Next transmissions</h2></div>
              <span className="mono text-[9px] uppercase tracking-[.12em] text-[#6f6e79]">{relatedTitles.length} nearby titles</span>
            </div>
            <div className="watch-related-grid">
              {relatedTitles.map((item) => (
                <Link href={`/watch/${item.id}`} key={item.id} className="watch-related-card focus-ring" data-testid={`link-related-${item.id}`}>
                  <RelatedPoster title={item} />
                  <span className="watch-related-label">{item.name}</span>
                  <span className="watch-related-meta">{item.type} / {item.year} / {item.duration}</span>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}