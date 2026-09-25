import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  FileVideo,
  Image as ImageIcon,
  Library,
  ListFilter,
  Play,
  Plus,
  Radio,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { Link } from 'wouter';
import { titles, type MediaType, type Title } from '../data';

type PublishStatus = 'draft' | 'published';

type StagedFile = {
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
};

type CatalogEntry = Title & {
  status: PublishStatus;
  videoFile?: StagedFile;
  posterFile?: StagedFile;
};

type FormState = {
  name: string;
  type: MediaType;
  description: string;
  year: string;
  rating: string;
  duration: string;
  genres: string;
  status: PublishStatus;
};

const initialForm: FormState = {
  name: '',
  type: 'film',
  description: '',
  year: '',
  rating: '',
  duration: '',
  genres: '',
  status: 'draft',
};

const seededCatalog: CatalogEntry[] = titles.map((title, index) => ({
  ...title,
  status: index < 6 ? 'published' : 'draft',
}));

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDateLabel = () =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

const createVideoThumbnail = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const sourceUrl = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      URL.revokeObjectURL(sourceUrl);
      video.removeAttribute('src');
      video.load();
    };

    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Unable to generate a thumbnail from this video.'));
    };

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, Math.max(0, video.duration / 2));
    };
    video.onseeked = () => {
      if (settled) return;
      const canvas = document.createElement('canvas');
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 360;
      const scale = Math.min(1, 960 / width);
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        fail();
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      settled = true;
      const thumbnail = canvas.toDataURL('image/jpeg', 0.82);
      cleanup();
      resolve(thumbnail);
    };
    video.onerror = fail;
    video.src = sourceUrl;
  });

function FileStagingCard({
  kind,
  file,
  accept,
  onChange,
  onClear,
}: {
  kind: 'video' | 'poster';
  file?: StagedFile;
  accept: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  const inputId = `staging-${kind}`;
  const isVideo = kind === 'video';
  return (
    <div className="studio-upload-card" data-testid={`card-upload-${kind}`}>
      <input key={file?.name || 'empty'} id={inputId} type="file" accept={accept} onChange={onChange} className="sr-only" data-testid={`input-file-${kind}`} />
      {file?.previewUrl ? (
        <div className="studio-poster-preview" style={{ backgroundImage: `url(${file.previewUrl})` }} aria-label={`${file.name} preview`} />
      ) : (
        <div className={`studio-upload-icon ${isVideo ? 'studio-upload-icon-video' : ''}`}>
          {isVideo ? <FileVideo size={19} strokeWidth={1.5} /> : <ImageIcon size={19} strokeWidth={1.5} />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="mono studio-label">{isVideo ? 'Primary video' : 'Poster artwork'}</p>
        {file ? (
          <>
            <p className="studio-file-name truncate" title={file.name} data-testid={`text-file-name-${kind}`}>{file.name}</p>
            <p className="studio-file-meta" data-testid={`text-file-meta-${kind}`}>{file.type || 'Unknown type'} <span>/</span> {formatSize(file.size)}</p>
            <div className="studio-progress" aria-label={`${kind} locally staged`}>
              <span style={{ width: '100%' }} />
            </div>
            <p className="studio-ready"><Check size={11} /> {isVideo && file.previewUrl ? 'Thumbnail generated' : 'Ready for local staging'}</p>
          </>
        ) : (
          <p className="studio-upload-copy">Choose a {isVideo ? 'video file' : 'poster image'} to stage a local preview.</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <label htmlFor={inputId} className="studio-choose-button" data-testid={`button-choose-${kind}`}>
          {file ? 'Replace' : 'Choose'}
        </label>
        {file && (
          <button type="button" onClick={onClear} aria-label={`Remove ${kind} file`} className="studio-icon-button" data-testid={`button-clear-${kind}`}>
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ htmlFor, children, optional = false }: { htmlFor: string; children: string; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="studio-field-label">
      {children}
      {optional && <span>Optional</span>}
    </label>
  );
}

function StatusPill({ status }: { status: PublishStatus }) {
  return (
    <span className={`studio-status studio-status-${status}`} data-testid={`status-${status}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function CatalogRow({
  entry,
  onStatusChange,
  onRemove,
}: {
  entry: CatalogEntry;
  onStatusChange: (id: string, status: PublishStatus) => void;
  onRemove: (entry: CatalogEntry) => void;
}) {
  return (
    <article className="studio-catalog-row" data-testid={`row-catalog-${entry.id}`}>
      <div className="studio-row-poster" style={{ backgroundImage: entry.poster ? `url(${entry.poster})` : `linear-gradient(145deg, ${entry.accent}, #161b26 75%)` }}>
        {entry.poster && <img src={entry.poster} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
        <span className="studio-row-play"><Play size={11} fill="currentColor" /></span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="studio-row-title truncate" data-testid={`text-catalog-title-${entry.id}`}>{entry.name}</h3>
          <StatusPill status={entry.status} />
        </div>
        <p className="studio-row-subtitle">{entry.type === 'film' ? 'Film' : 'Series'} <span>/</span> {entry.year} <span>/</span> {entry.duration}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entry.genres.slice(0, 3).map((genre) => <span className="studio-genre" key={`${entry.id}-${genre}`}>{genre}</span>)}
        </div>
      </div>
      <div className="studio-row-actions">
        <label className="sr-only" htmlFor={`status-${entry.id}`}>Change status for {entry.name}</label>
        <div className="studio-status-select">
          <select id={`status-${entry.id}`} value={entry.status} onChange={(event) => onStatusChange(entry.id, event.target.value as PublishStatus)} data-testid={`select-status-${entry.id}`}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <ChevronDown size={12} />
        </div>
        <button type="button" onClick={() => onRemove(entry)} aria-label={`Remove ${entry.name}`} className="studio-icon-button studio-delete-button" data-testid={`button-remove-${entry.id}`}>
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}

function EmptyCatalog({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return (
    <div className="studio-empty-state" data-testid="empty-catalog">
      <div className="studio-empty-mark"><Library size={22} strokeWidth={1.2} /></div>
      <p className="mono studio-eyebrow">No signal here</p>
      <h3>{filtered ? 'No titles match this filter.' : 'The catalogue is waiting.'}</h3>
      <p>{filtered ? 'Try a different search or show every title in the index.' : 'Add the first transmission from the studio to begin shaping the shelf.'}</p>
      {filtered && <button type="button" onClick={onReset} className="studio-text-button" data-testid="button-reset-filter">Reset filters</button>}
    </div>
  );
}

export default function AdminStudio() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>(seededCatalog);
  const [form, setForm] = useState<FormState>(initialForm);
  const [videoFile, setVideoFile] = useState<StagedFile>();
  const [posterFile, setPosterFile] = useState<StagedFile>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | PublishStatus>('all');
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState<CatalogEntry | null>(null);

  const publishedCount = catalog.filter((entry) => entry.status === 'published').length;
  const draftCount = catalog.length - publishedCount;
  const filmCount = catalog.filter((entry) => entry.type === 'film').length;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCatalog = useMemo(() => catalog.filter((entry) => {
    const matchesStatus = filter === 'all' || entry.status === filter;
    const haystack = [entry.name, entry.description, entry.type, entry.rating, ...entry.genres].join(' ').toLowerCase();
    return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
  }), [catalog, filter, normalizedQuery]);

  const updateForm = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const stageFile = async (event: ChangeEvent<HTMLInputElement>, kind: 'video' | 'poster') => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    const staged: StagedFile = {
      name: selected.name,
      type: selected.type || 'application/octet-stream',
      size: selected.size,
      previewUrl: kind === 'poster' ? URL.createObjectURL(selected) : undefined,
    };
    if (kind === 'video') {
      setVideoFile(staged);
      setNotice('Video staged. Generating a thumbnail from the opening frame...');
      try {
        const previewUrl = await createVideoThumbnail(selected);
        setVideoFile((current) => current?.name === selected.name ? { ...current, previewUrl } : current);
        setNotice('Video staged and thumbnail generated automatically.');
      } catch {
        setNotice('Video staged, but a thumbnail could not be generated from this file.');
      }
    } else {
      setPosterFile(staged);
      setNotice('Poster staged in this browser.');
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setVideoFile(undefined);
    setPosterFile(undefined);
    setNotice('Form reset. Nothing has been added to the catalogue.');
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.description.trim() || !form.year.trim()) {
      setNotice('Add a title, year, and description before staging this transmission.');
      return;
    }
    const genres = form.genres.split(',').map((genre) => genre.trim()).filter(Boolean);
    const id = `${form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled'}-${Date.now()}`;
    const posterUrl = posterFile?.previewUrl || videoFile?.previewUrl || '';
    const entry: CatalogEntry = {
      id,
      name: form.name.trim(),
      eyebrow: form.type === 'film' ? 'Local studio film' : 'Local studio series',
      year: Number(form.year),
      rating: form.rating.trim() || 'NR',
      duration: form.duration.trim() || 'Not set',
      type: form.type,
      genres: genres.length ? genres : ['Unsorted'],
      description: form.description.trim(),
      poster: posterUrl,
      backdrop: posterUrl,
      accent: form.type === 'film' ? '#d2a56a' : '#91b9af',
      status: form.status,
      videoFile,
      posterFile,
    };
    setCatalog((current) => [entry, ...current]);
    setForm(initialForm);
    setVideoFile(undefined);
    setPosterFile(undefined);
    setNotice(`${entry.name} is staged as a local ${entry.status}.`);
  };

  const removeEntry = (entry: CatalogEntry) => {
    setCatalog((current) => current.filter((item) => item.id !== entry.id));
    setConfirming(null);
    setNotice(`${entry.name} removed from this local catalogue.`);
  };

  return (
    <div className="studio-shell grain min-h-[100dvh]">
      <aside className="studio-rail">
        <Link href="/" className="studio-brand-link" data-testid="link-studio-public">
          <span className="studio-brand-orbit"><span>C/</span></span>
          <span><strong>CYPHER</strong><small>STREAM / STUDIO</small></span>
        </Link>
        <div className="studio-rail-rule" />
        <p className="mono studio-rail-kicker">Control room</p>
        <nav className="studio-rail-nav" aria-label="Studio sections">
          <a href="#intake" className="studio-rail-link studio-rail-link-active" data-testid="link-studio-intake"><UploadCloud size={15} /> Intake <span>01</span></a>
          <a href="#catalogue" className="studio-rail-link" data-testid="link-studio-catalogue"><Library size={15} /> Catalogue <span>{catalog.length}</span></a>
        </nav>
        <div className="studio-rail-footer">
          <div className="studio-live-marker"><span /> Local workspace</div>
          <p>Private cinema, carefully indexed.</p>
        </div>
      </aside>

      <div className="studio-main">
        <header className="studio-topbar">
          <div className="flex items-center gap-3">
            <span className="studio-topbar-slash">/</span>
            <span className="mono studio-topbar-label">Studio / Content intake</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <span className="mono hidden text-[9px] uppercase tracking-[.18em] text-[#6f7780] sm:block">Local mode</span>
            <Link href="/" className="studio-public-link" data-testid="link-return-public"><ArrowLeft size={14} /> Return to cinema</Link>
            <span className="studio-avatar" aria-label="Admin profile">AS</span>
          </div>
        </header>

        <main className="mx-auto max-w-[1480px] px-5 pb-20 sm:px-8 lg:px-12">
          <section className="studio-heading reveal">
            <div>
              <p className="mono studio-eyebrow">Editorial operations / {formatDateLabel()}</p>
              <h1>Shape the <em>index.</em></h1>
              <p className="studio-heading-copy">Stage a new transmission, tune its metadata, and decide what is ready for curious viewers.</p>
            </div>
            <div className="studio-signal-card">
              <Radio size={17} />
              <div><span className="mono">Workspace status</span><strong>Local staging only</strong></div>
            </div>
          </section>

          <section className="studio-summary-grid reveal reveal-delay-1" aria-label="Catalogue summary">
            <div className="studio-summary-feature">
              <div className="flex items-center justify-between"><span className="mono studio-summary-label">Total index</span><Library size={16} /></div>
              <strong data-testid="text-summary-total">{catalog.length}</strong>
              <span>transmissions in workspace</span>
            </div>
            <div className="studio-summary-card"><span className="mono studio-summary-label">Published</span><strong data-testid="text-summary-published">{publishedCount}</strong><span>visible on public shelf</span></div>
            <div className="studio-summary-card"><span className="mono studio-summary-label">Drafts</span><strong data-testid="text-summary-drafts">{draftCount}</strong><span>awaiting a final signal</span></div>
            <div className="studio-summary-card"><span className="mono studio-summary-label">Film / series</span><strong data-testid="text-summary-films">{filmCount} <small>/ {catalog.length - filmCount}</small></strong><span>format split</span></div>
          </section>

          <div className="studio-layout">
            <section id="intake" className="studio-panel studio-intake-panel reveal reveal-delay-2">
              <div className="studio-panel-heading">
                <div><p className="mono studio-eyebrow">01 / Intake</p><h2>New transmission</h2></div>
                <span className="studio-panel-number">A—01</span>
              </div>
              <div className="studio-local-note"><Archive size={14} /><p><strong>Local staging.</strong> Files are previewed in this browser only; no media is uploaded to a server in this iteration.</p></div>
              <form onSubmit={submit} className="studio-form">
                <div className="studio-upload-grid">
                  <FileStagingCard kind="video" file={videoFile} accept="video/*" onChange={(event) => stageFile(event, 'video')} onClear={() => setVideoFile(undefined)} />
                  <FileStagingCard kind="poster" file={posterFile} accept="image/*" onChange={(event) => stageFile(event, 'poster')} onClear={() => setPosterFile(undefined)} />
                </div>
                <div className="studio-form-rule"><span>Metadata</span></div>
                <div className="studio-field">
                  <FieldLabel htmlFor="title-name">Title / name</FieldLabel>
                  <input id="title-name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="e.g. The Shape of an Afternoon" data-testid="input-title-name" />
                </div>
                <div className="studio-fields-two">
                  <div className="studio-field">
                    <FieldLabel htmlFor="content-type">Content type</FieldLabel>
                    <div className="studio-select-wrap"><select id="content-type" value={form.type} onChange={(event) => updateForm('type', event.target.value)} data-testid="select-content-type"><option value="film">Film</option><option value="series">Series</option></select><ChevronDown size={14} /></div>
                  </div>
                  <div className="studio-field">
                    <FieldLabel htmlFor="publish-status">Publishing status</FieldLabel>
                    <div className="studio-select-wrap"><select id="publish-status" value={form.status} onChange={(event) => updateForm('status', event.target.value)} data-testid="select-publish-status"><option value="draft">Draft</option><option value="published">Published</option></select><ChevronDown size={14} /></div>
                  </div>
                </div>
                <div className="studio-field">
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <textarea id="description" value={form.description} onChange={(event) => updateForm('description', event.target.value)} rows={4} placeholder="Give the viewer a reason to stay with it." data-testid="input-description" />
                  <span className="studio-character-count">{form.description.length} / 240</span>
                </div>
                <div className="studio-fields-three">
                  <div className="studio-field"><FieldLabel htmlFor="release-year">Year</FieldLabel><input id="release-year" type="number" min="1888" max="2100" value={form.year} onChange={(event) => updateForm('year', event.target.value)} placeholder="2025" data-testid="input-year" /></div>
                  <div className="studio-field"><FieldLabel htmlFor="content-rating">Rating</FieldLabel><input id="content-rating" value={form.rating} onChange={(event) => updateForm('rating', event.target.value)} placeholder="PG-13" data-testid="input-rating" /></div>
                  <div className="studio-field"><FieldLabel htmlFor="duration">Duration</FieldLabel><input id="duration" value={form.duration} onChange={(event) => updateForm('duration', event.target.value)} placeholder="1h 42m" data-testid="input-duration" /></div>
                </div>
                <div className="studio-field">
                  <FieldLabel htmlFor="genres" optional>Genres</FieldLabel>
                  <input id="genres" value={form.genres} onChange={(event) => updateForm('genres', event.target.value)} placeholder="Drama, Tender, World cinema" data-testid="input-genres" />
                  <span className="studio-help-text">Separate genres with commas.</span>
                </div>
                <div className="studio-form-actions">
                  <button type="button" onClick={resetForm} className="studio-reset-button" data-testid="button-reset-form">Clear form</button>
                  <button type="submit" className="studio-submit-button" data-testid="button-add-title"><Plus size={16} /> Add to catalogue</button>
                </div>
                {notice && <p className="studio-form-notice" role="status" data-testid="status-form-notice">{notice}</p>}
              </form>
            </section>

            <section id="catalogue" className="studio-panel studio-catalog-panel reveal reveal-delay-3">
              <div className="studio-panel-heading">
                <div><p className="mono studio-eyebrow">02 / Catalogue</p><h2>Current index</h2></div>
                <button type="button" onClick={() => { setQuery(''); setFilter('all'); }} className="studio-icon-button" aria-label="Reset catalogue filters" data-testid="button-reset-catalogue"><ListFilter size={16} /></button>
              </div>
              <div className="studio-catalog-toolbar">
                <label className="studio-search">
                  <Search size={15} />
                  <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, genres..." aria-label="Search catalogue" data-testid="input-catalogue-search" />
                </label>
                <div className="studio-filter-tabs" role="group" aria-label="Filter catalogue by status">
                  {(['all', 'published', 'draft'] as const).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={filter === item ? 'studio-filter-active' : ''} aria-pressed={filter === item} data-testid={`button-filter-${item}`}>{item === 'all' ? 'All' : item}</button>)}
                </div>
              </div>
              <div className="studio-catalog-meta"><span className="mono">{filteredCatalog.length} of {catalog.length} titles</span><span className="mono">Last local change / {formatDateLabel()}</span></div>
              <div className="studio-catalog-list">
                {filteredCatalog.length ? filteredCatalog.map((entry) => <CatalogRow key={entry.id} entry={entry} onStatusChange={(id, status) => { setCatalog((current) => current.map((item) => item.id === id ? { ...item, status } : item)); setNotice(`Status updated to ${status}.`); }} onRemove={setConfirming} />) : <EmptyCatalog filtered={Boolean(query || filter !== 'all')} onReset={() => { setQuery(''); setFilter('all'); }} />}
              </div>
            </section>
          </div>
        </main>
      </div>

      {confirming && (
        <div className="studio-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="remove-title">
          <div className="studio-confirm-card">
            <button type="button" className="studio-confirm-close studio-icon-button" onClick={() => setConfirming(null)} aria-label="Close remove confirmation" data-testid="button-close-remove"><X size={15} /></button>
            <div className="studio-empty-mark"><Trash2 size={20} strokeWidth={1.3} /></div>
            <p className="mono studio-eyebrow">Remove transmission</p>
            <h2 id="remove-title">Take {confirming.name} off the index?</h2>
            <p>This only removes the title from this local workspace. You can stage it again later.</p>
            <div className="studio-confirm-actions"><button type="button" onClick={() => setConfirming(null)} className="studio-reset-button" data-testid="button-cancel-remove">Keep title</button><button type="button" onClick={() => removeEntry(confirming)} className="studio-danger-button" data-testid="button-confirm-remove">Remove title</button></div>
          </div>
        </div>
      )}
      <div className="studio-mobile-footer"><Link href="/" data-testid="link-mobile-return"><ArrowLeft size={14} /> Return to cinema</Link></div>
    </div>
  );
}