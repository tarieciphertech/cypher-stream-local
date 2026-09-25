import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { ArrowLeft, Bookmark, Check, Clapperboard, Film, ListVideo, Play, Radio } from 'lucide-react';
import { Link, useParams } from 'wouter';
import type { CatalogResponse, CatalogTitleDetail } from '@workspace/api-zod';

const posterFallback = (title: CatalogTitleDetail) =>
  `linear-gradient(145deg, ${title.accent || '#2a2d45'} 0%, #171822 62%, #080a11 100%)`;

const progressKey = (titleId: string, episodeId?: string) =>
  `cypher-playback-${titleId}-${episodeId || 'feature'}`;

function ScreeningSkeleton() {
  return (
    <div className="watch-shell grain" data-testid="loading-watch-page">
      <div className="watch-content">
        <header className="watch-topbar"><span className="watch-back-link">Loading the local catalogue</span></header>
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
          <div className="watch-top-meta"><span className="watch-signal" /> Local index</div>
        </header>
        <main className="watch-unknown">
          <div>
            <div className="watch-unknown-mark"><Radio size={26} strokeWidth={1.3} /></div>
            <p className="watch-kicker mt-6">Transmission unavailable</p>
            <h1>This title is not in the local catalogue.</h1>
            <p>The requested title could not be loaded from the LAN media library.</p>
            <Link href="/" className="watch-action-primary focus-ring mt-7" data-testid="link-browse-from-unknown"><ArrowLeft size={14} /> Return to the shelf</Link>
          </div>
        </main>
      </div>
    </div>
  );
}

function RelatedPoster({ title }: { title: CatalogTitleDetail }) {
  return (
    <div className="watch-related-poster" style={{ backgroundImage: posterFallback(title) }}>
      {title.posterUrl && <img src={title.posterUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
    </div>
  );
}

export default function WatchPage() {
  const params = useParams<{ id?: string }>();
  const [isResolving, setIsResolving] = useState(true);
  const [title, setTitle] = useState<CatalogTitleDetail | null>(null);
  const [relatedTitles, setRelatedTitles] = useState<CatalogResponse['items']>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const episodes = useMemo(
    () => title?.seasons.flatMap((season) => season.episodes.map((episode) => ({
      ...episode,
      seasonNumber: season.seasonNumber,
    }))) || [],
    [title],
  );

  const selectedEpisode = episodes.find((episode) => episode.id === selectedEpisodeId) || episodes[0];
  const source = selectedEpisode?.sourceUrl || title?.sourceUrl || null;
  const currentProgressKey = title ? progressKey(title.id, selectedEpisode?.id) : '';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsResolving(true);
      try {
        const [detailResponse, catalogResponse] = await Promise.all([
          fetch(`/api/titles/${encodeURIComponent(params.id || '')}`),
          fetch('/api/catalog?limit=100'),
        ]);
        if (!detailResponse.ok) {
          if (!cancelled) setTitle(null);
          return;
        }
        const detail = await detailResponse.json() as CatalogTitleDetail;
        const catalog = catalogResponse.ok ? await catalogResponse.json() as CatalogResponse : null;
        if (!cancelled) {
          setTitle(detail);
          setRelatedTitles(
            (catalog?.items || [])
              .filter((item) => item.id !== detail.id)
              .filter((item) => detail.genres.length === 0 || item.genres.some((genre) => detail.genres.some((g) => g.id === genre.id)))
              .slice(0, 4),
          );
          setSelectedEpisodeId(detail.seasons[0]?.episodes[0]?.id || '');
        }
      } catch {
        if (!cancelled) setTitle(null);
      } finally {
        if (!cancelled) setIsResolving(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [params.id]);

  useEffect(() => {
    if (!title) return;
    setIsSaved(window.localStorage.getItem(`cypher-saved-${title.id}`) === 'true');
    setPlaybackError(false);
  }, [title]);

  useEffect(() => {
    if (!title) return;
    const stored = Number(window.localStorage.getItem(currentProgressKey));
    setProgress(Number.isFinite(stored) ? Math.min(100, Math.max(0, stored)) : 0);
    setPlaybackError(false);
  }, [title, currentProgressKey]);

  if (isResolving) return <ScreeningSkeleton />;
  if (!title) return <UnknownTransmission />;

  const toggleSaved = () => {
    setIsSaved((current) => {
      const next = !current;
      window.localStorage.setItem(`cypher-saved-${title.id}`, String(next));
      return next;
    });
  };

  const restoreProgress = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const stored = Number(window.localStorage.getItem(currentProgressKey));
    if (Number.isFinite(stored) && stored > 0 && stored < 100 && video.duration) {
      video.currentTime = video.duration * (stored / 100);
    }
  };

  const handleTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const next = Math.round((video.currentTime / video.duration) * 1000) / 10;
    setProgress(next);
    window.localStorage.setItem(currentProgressKey, String(next));
  };

  const playFromCurrentPosition = () => {
    void videoRef.current?.play().catch(() => undefined);
  };

  const selectRelativeEpisode = (direction: -1 | 1) => {
    if (!selectedEpisode) return;
    const index = episodes.findIndex((episode) => episode.id === selectedEpisode.id);
    const next = episodes[index + direction];
    if (next) setSelectedEpisodeId(next.id);
  };

  return (
    <div className="watch-shell grain" data-testid={`page-watch-${title.id}`}>
      <div className="watch-backdrop" style={{ backgroundImage: `${title.backdropUrl ? `url(${title.backdropUrl}), ` : ''}${posterFallback(title)}` }} />
      <div className="watch-content">
        <header className="watch-topbar">
          <Link href="/" className="watch-back-link focus-ring" data-testid="link-back-to-cinema"><ArrowLeft size={15} /> Back to cinema</Link>
          <div className="watch-top-meta"><span className="watch-signal" /> Screening room <span>/</span> Local LAN playback</div>
          <Link href="/" className="hidden text-[#aaa8b2] transition-colors hover:text-[#e8bc71] sm:block" aria-label="Return to browse" data-testid="link-watch-brand"><Clapperboard size={17} /></Link>
        </header>

        <main className="watch-stage">
          <section className="watch-heading reveal">
            <div>
              <p className="watch-kicker" data-testid="text-watch-kicker">{title.mediaType === 'series' ? 'Local series' : 'Local feature'}</p>
              <h1 data-testid="text-watch-title">{title.name}</h1>
            </div>
            <p className="watch-heading-note">Direct playback<br />from the LAN media library</p>
          </section>

          <section className="watch-player-frame reveal reveal-delay-1" aria-label={`${title.name} video player`}>
            {source ? (
              <video
                key={`${title.id}-${selectedEpisode?.id || 'feature'}`}
                ref={videoRef}
                className="watch-player"
                controls
                playsInline
                preload="metadata"
                poster={title.posterUrl || undefined}
                src={source}
                onLoadedMetadata={restoreProgress}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                  window.localStorage.setItem(currentProgressKey, '100');
                  setProgress(100);
                }}
                onError={() => setPlaybackError(true)}
                data-testid="video-player"
              />
            ) : (
              <div className="watch-player flex items-center justify-center">
                <p className="watch-error-note">No playable source is catalogued for this title.</p>
              </div>
            )}
            <div className="watch-player-caption">
              <span><strong>LAN stream</strong> / {selectedEpisode ? `S${String(selectedEpisode.seasonNumber).padStart(2, '0')}E${String(selectedEpisode.episodeNumber).padStart(2, '0')} · ${selectedEpisode.name}` : 'Selected feature presentation'}</span>
              <span data-testid="text-watch-progress">{progress.toFixed(1)}% saved</span>
            </div>
          </section>

          {playbackError && (
            <p className="watch-error-note" role="status" data-testid="status-playback-error">
              The local media file could not be played by this browser. MP4/WebM files should play directly; MKV/other formats may require browser-compatible transcoding later.
            </p>
          )}

          <section className="watch-detail-grid reveal reveal-delay-2">
            <div>
              <div className="watch-meta-line" data-testid="text-watch-metadata">
                <span>{title.mediaType === 'film' ? 'Film' : 'Series'}</span>
                <span className="watch-meta-separator">/</span>
                <span>{title.releaseYear || 'Local library'}</span>
                <span className="watch-meta-separator">/</span>
                <span>{selectedEpisode?.runtimeMinutes || title.runtimeMinutes || '—'} min</span>
                {title.genres.map((genre) => <span className="watch-genre" key={genre.id}>{genre.name}</span>)}
              </div>
              <p className="watch-description" data-testid="text-watch-description">{title.synopsis || 'Local media from the Cypher-Stream LAN library.'}</p>
              <div className="watch-action-row">
                <button type="button" onClick={playFromCurrentPosition} className="watch-action-primary focus-ring" data-testid="button-watch-play"><Play size={14} fill="currentColor" /> {progress > 0 && progress < 98 ? 'Resume transmission' : 'Play transmission'}</button>
                {title.mediaType === 'series' && (
                  <>
                    <button type="button" onClick={() => selectRelativeEpisode(-1)} disabled={!episodes.length || episodes.findIndex((episode) => episode.id === selectedEpisode?.id) <= 0} className="watch-action-secondary focus-ring">Previous</button>
                    <button type="button" onClick={() => selectRelativeEpisode(1)} disabled={!episodes.length || episodes.findIndex((episode) => episode.id === selectedEpisode?.id) >= episodes.length - 1} className="watch-action-secondary focus-ring">Next</button>
                  </>
                )}
                <button type="button" onClick={toggleSaved} className="watch-action-secondary focus-ring" aria-pressed={isSaved} data-testid="button-watch-my-list">{isSaved ? <Check size={14} /> : <Bookmark size={14} />} {isSaved ? 'In My List' : 'My List'}</button>
              </div>
            </div>

            <aside className="watch-side-card" aria-label="Screening information">
              <p className="watch-kicker">Local media library</p>
              <p className="watch-side-copy">Playback is served directly by the Cypher-Stream Node server from the LAN media directory.</p>
              {title.mediaType === 'series' ? (
                <div className="mt-6">
                  <div className="flex items-center gap-2"><ListVideo size={14} className="text-[#c4e56b]" /><h2>Choose an episode</h2></div>
                  <div className="watch-episode-list" role="listbox" aria-label="Episodes">
                    {title.seasons.map((season) => (
                      <div key={season.id} className="contents">
                        <div className="watch-kicker mt-4">Season {season.seasonNumber}</div>
                        {season.episodes.map((episode) => (
                          <button
                            key={episode.id}
                            type="button"
                            role="option"
                            aria-selected={selectedEpisode?.id === episode.id}
                            onClick={() => setSelectedEpisodeId(episode.id)}
                            className={`watch-episode focus-ring ${selectedEpisode?.id === episode.id ? 'watch-episode-active' : ''}`}
                          >
                            <span>{episode.name}</span><small>{selectedEpisode?.id === episode.id ? 'NOW' : `E${String(episode.episodeNumber).padStart(2, '0')}`}</small>
                          </button>
                        ))}
                      </div>
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
                  <RelatedPoster title={{ ...item, seasons: [], sourceUrl: item.sourceUrl }} />
                  <span className="watch-related-label">{item.name}</span>
                  <span className="watch-related-meta">{item.mediaType} / {item.releaseYear || 'local'} / {item.runtimeMinutes || '—'} min</span>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
