export type MediaType = 'film' | 'series';

export interface Episode {
  id: string;
  label: string;
  source: string;
  duration?: string;
}

export interface Title {
  id: string;
  name: string;
  eyebrow: string;
  year: number;
  rating: string;
  duration: string;
  type: MediaType;
  genres: string[];
  description: string;
  poster: string;
  backdrop: string;
  accent: string;
  playbackSource?: string;
  episodes?: Episode[];
  progress?: number;
  badge?: string;
}

const tmdb = (path: string, size: 'w500' | 'w780' | 'original' = 'w500') =>
  `https://image.tmdb.org/t/p/${size}${path}`;

export const prototypeVideoSources = [
  'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
];

const prototypeEpisodes = (id: string): Episode[] => [
  { id: `${id}-episode-1`, label: 'Episode 01 / The opening signal', source: prototypeVideoSources[0] },
  { id: `${id}-episode-2`, label: 'Episode 02 / A room with no doors', source: prototypeVideoSources[1] },
  { id: `${id}-episode-3`, label: 'Episode 03 / The shape of a secret', source: prototypeVideoSources[2] },
];

export const featuredTitle: Title = {
  id: 'the-quiet-girl',
  name: 'The Quiet Girl',
  eyebrow: 'A Cypher Original Film',
  year: 2022,
  rating: 'PG-13',
  duration: '1h 34m',
  type: 'film',
  genres: ['Drama', 'Irish Cinema'],
  description:
    'In rural Ireland, a withdrawn young girl discovers a new kind of home — and the silence between what is said and what is felt.',
  poster: tmdb('/p6G24P1x5jXvK6jJbM7B0kVQ2x4.jpg'),
  backdrop: tmdb('/5Yg3c0cV4bXJQ0h5jTz0Kj2v2zQ.jpg', 'original'),
  accent: '#c4e56b',
  playbackSource: prototypeVideoSources[0],
  badge: 'Quietly acclaimed',
};

export const titles: Title[] = ([
  featuredTitle,
  {
    id: 'after-yang',
    name: 'After Yang',
    eyebrow: 'Kogonada',
    year: 2022,
    rating: 'PG',
    duration: '1h 36m',
    type: 'film',
    genres: ['Sci-Fi', 'Tender'],
    description: 'A family repairs the memory of an android and finds a lifetime hidden in the gaps.',
    poster: tmdb('/6l2t1lVAKrOeC2wN8U3j9pQJ6Kj.jpg'),
    backdrop: tmdb('/5b8d9a0c9f3a2e7b1d6c4f0a2e1.jpg', 'w780'),
    accent: '#e8bc71',
    progress: 42,
    badge: 'Continue watching',
  },
  {
    id: 'decision-to-leave',
    name: 'Decision to Leave',
    eyebrow: 'Park Chan-wook',
    year: 2022,
    rating: 'R',
    duration: '2h 18m',
    type: 'film',
    genres: ['Mystery', 'Romance'],
    description: 'A detective falls into a case that refuses to stay solved.',
    poster: tmdb('/N7zA9nL0wJ5cQ2kM1xP3vB8sT4r.jpg'),
    backdrop: tmdb('/qDWA7f1vL3J2xN9mK5cR8sB0h6A.jpg', 'w780'),
    accent: '#db9275',
  },
  {
    id: 'severance',
    name: 'Severance',
    eyebrow: 'Season 02',
    year: 2025,
    rating: 'TV-MA',
    duration: '9 episodes',
    type: 'series',
    genres: ['Thriller', 'Sci-Fi'],
    description: 'What if your work self and your real self never had to meet?',
    poster: tmdb('/l2QSVFRR2M5k8P2J8f3v1d4c6b7.jpg'),
    backdrop: tmdb('/wqL8Z5eT2kM6dN0pR1cS3fV7b9X.jpg', 'w780'),
    accent: '#b8c7d9',
    progress: 68,
    badge: 'Back in the maze',
  },
  {
    id: 'past-lives',
    name: 'Past Lives',
    eyebrow: 'Celine Song',
    year: 2023,
    rating: 'PG-13',
    duration: '1h 46m',
    type: 'film',
    genres: ['Romance', 'Drama'],
    description: 'Two childhood friends reunite across two decades, one week, and a lifetime of what-ifs.',
    poster: tmdb('/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg'),
    backdrop: tmdb('/xTW7o1fJbY5kN2sD0cR8mQ6vL4A.jpg', 'w780'),
    accent: '#dfae82',
  },
  {
    id: 'the-bear',
    name: 'The Bear',
    eyebrow: 'FX on Cypher',
    year: 2024,
    rating: 'TV-MA',
    duration: '3 seasons',
    type: 'series',
    genres: ['Drama', 'Comedy'],
    description: 'A young chef returns home to run his family sandwich shop and find a new rhythm.',
    poster: tmdb('/sHFlbKS3WLqMnp9mXy2Xq9fG1kP.jpg'),
    backdrop: tmdb('/7o2y7o2y7o2y7o2y7o2y7o2y7o2.jpg', 'w780'),
    accent: '#ef8d69',
  },
  {
    id: 'the-worst-person',
    name: 'The Worst Person in the World',
    eyebrow: 'Joachim Trier',
    year: 2021,
    rating: 'R',
    duration: '2h 8m',
    type: 'film',
    genres: ['Romance', 'Modern life'],
    description: 'Four years in the life of a young woman navigating the troubled waters of her love life.',
    poster: tmdb('/1I3IG1cWn3R8k9L5v2Q7x0S6p4M.jpg'),
    backdrop: tmdb('/6y8x4q2w0e9r7t5y3u1i8o6p4a2s.jpg', 'w780'),
    accent: '#e3c477',
  },
  {
    id: 'the-last-of-us',
    name: 'The Last of Us',
    eyebrow: 'HBO',
    year: 2023,
    rating: 'TV-MA',
    duration: '1 season',
    type: 'series',
    genres: ['Drama', 'Survival'],
    description: 'Twenty years after civilization is destroyed, a smuggler must escort a teenager through the ruins.',
    poster: tmdb('/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg'),
    backdrop: tmdb('/9f6k8m4p2r0t7y5w3q1e8i6o4u2a.jpg', 'w780'),
    accent: '#8aa98b',
  },
  {
    id: 'the-lighthouse',
    name: 'The Lighthouse',
    eyebrow: 'Robert Eggers',
    year: 2019,
    rating: 'R',
    duration: '1h 49m',
    type: 'film',
    genres: ['Horror', 'Myth'],
    description: 'Two lighthouse keepers try to maintain their sanity while living on a remote and mysterious island.',
    poster: tmdb('/3D4x5Zz3n8f1c2b7v0m6l9k4j5h.jpg'),
    backdrop: tmdb('/8h6j4k2l0m9n7b5v3c1x8z6a4s2d.jpg', 'w780'),
    accent: '#b9c4b4',
  },
  {
    id: 'moonlight',
    name: 'Moonlight',
    eyebrow: 'Barry Jenkins',
    year: 2016,
    rating: 'R',
    duration: '1h 51m',
    type: 'film',
    genres: ['Drama', 'Coming of age'],
    description: 'A young man finds and carries his identity through the bright, blue hours of Miami.',
    poster: tmdb('/qAwFbszz0kRyTuXmMeKQZCX3Q2O.jpg'),
    backdrop: tmdb('/6ELCZlTA5lGUops70h9w4fY3n8b.jpg', 'w780'),
    accent: '#7a93ce',
  },
  {
    id: 'triangle-of-sadness',
    name: 'Triangle of Sadness',
    eyebrow: 'Ruben Östlund',
    year: 2022,
    rating: 'R',
    duration: '2h 27m',
    type: 'film',
    genres: ['Satire', 'Unruly'],
    description: 'A cruise for the super-rich sinks into a hierarchy-reversing social experiment.',
    poster: tmdb('/1f5c7b9e3d2a8f6g4h0j7k5l9m.jpg'),
    backdrop: tmdb('/1k4m7p0s3v6x9z2c5b8n1q4w7e.jpg', 'w780'),
    accent: '#9ebc9a',
  },
  ] as Title[]).map((title, index) => ({
  ...title,
  playbackSource: title.playbackSource || prototypeVideoSources[index % prototypeVideoSources.length],
  episodes: title.type === 'series' ? title.episodes || prototypeEpisodes(title.id) : title.episodes,
}));

export const genreMoods = [
  { name: 'Slow burn', count: 18, color: '#485a67', image: tmdb('/qDWA7f1vL3J2xN9mK5cR8sB0h6A.jpg', 'w500') },
  { name: 'Strange futures', count: 24, color: '#584f71', image: tmdb('/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 'w500') },
  { name: 'Tender chaos', count: 31, color: '#79534f', image: tmdb('/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg', 'w500') },
  { name: 'World cinema', count: 46, color: '#6b6747', image: tmdb('/1I3IG1cWn3R8k9L5v2Q7x0S6p4M.jpg', 'w500') },
];