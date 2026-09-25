insert into public.genres (slug, name) values
  ('drama', 'Drama'),
  ('sci-fi', 'Sci-Fi'),
  ('thriller', 'Thriller'),
  ('romance', 'Romance'),
  ('mystery', 'Mystery'),
  ('comedy', 'Comedy'),
  ('survival', 'Survival'),
  ('horror', 'Horror'),
  ('coming-of-age', 'Coming of age'),
  ('satire', 'Satire'),
  ('world-cinema', 'World cinema')
on conflict (slug) do nothing;

insert into public.titles (id, slug, name, synopsis, media_type, release_year, maturity_rating, runtime_minutes, status, accent, featured, badge) values
  ('the-quiet-girl', 'the-quiet-girl', 'The Quiet Girl', 'In rural Ireland, a withdrawn young girl discovers a new kind of home — and the silence between what is said and what is felt.', 'film', 2022, 'PG-13', 94, 'published', '#c4e56b', true, 'Quietly acclaimed'),
  ('after-yang', 'after-yang', 'After Yang', 'A family repairs the memory of an android and finds a lifetime hidden in the gaps.', 'film', 2022, 'PG', 96, 'published', '#e8bc71', false, 'Continue watching'),
  ('decision-to-leave', 'decision-to-leave', 'Decision to Leave', 'A detective falls into a case that refuses to stay solved.', 'film', 2022, 'R', 138, 'published', '#db9275', false, null),
  ('severance', 'severance', 'Severance', 'What if your work self and your real self never had to meet?', 'series', 2025, 'TV-MA', null, 'published', '#b8c7d9', false, 'Back in the maze'),
  ('past-lives', 'past-lives', 'Past Lives', 'Two childhood friends reunite across two decades, one week, and a lifetime of what-ifs.', 'film', 2023, 'PG-13', 106, 'published', '#dfae82', false, null),
  ('the-bear', 'the-bear', 'The Bear', 'A young chef returns home to run his family sandwich shop and find a new rhythm.', 'series', 2024, 'TV-MA', null, 'published', '#ef8d69', false, null),
  ('the-worst-person', 'the-worst-person-in-the-world', 'The Worst Person in the World', 'Four years in the life of a young woman navigating the troubled waters of her love life.', 'film', 2021, 'R', 128, 'published', '#e3c477', false, null),
  ('the-last-of-us', 'the-last-of-us', 'The Last of Us', 'Twenty years after civilization is destroyed, a smuggler must escort a teenager through the ruins.', 'series', 2023, 'TV-MA', null, 'published', '#8aa98b', false, null),
  ('the-lighthouse', 'the-lighthouse', 'The Lighthouse', 'Two lighthouse keepers try to maintain their sanity while living on a remote and mysterious island.', 'film', 2019, 'R', 109, 'published', '#b9c4b4', false, null),
  ('moonlight', 'moonlight', 'Moonlight', 'A young man finds and carries his identity through the bright, blue hours of Miami.', 'film', 2016, 'R', 111, 'published', '#7a93ce', false, null),
  ('triangle-of-sadness', 'triangle-of-sadness', 'Triangle of Sadness', 'A cruise for the super-rich sinks into a hierarchy-reversing social experiment.', 'film', 2022, 'R', 147, 'published', '#9ebc9a', false, null)
on conflict (id) do update set
  name = excluded.name,
  synopsis = excluded.synopsis,
  media_type = excluded.media_type,
  release_year = excluded.release_year,
  maturity_rating = excluded.maturity_rating,
  runtime_minutes = excluded.runtime_minutes,
  status = excluded.status,
  accent = excluded.accent,
  featured = excluded.featured,
  badge = excluded.badge,
  updated_at = now();

insert into public.title_genres (title_id, genre_id)
select v.title_id, g.id
from (values
  ('the-quiet-girl', 'drama'), ('the-quiet-girl', 'world-cinema'),
  ('after-yang', 'sci-fi'), ('after-yang', 'drama'),
  ('decision-to-leave', 'mystery'), ('decision-to-leave', 'romance'),
  ('severance', 'thriller'), ('severance', 'sci-fi'),
  ('past-lives', 'romance'), ('past-lives', 'drama'),
  ('the-bear', 'drama'), ('the-bear', 'comedy'),
  ('the-worst-person', 'romance'), ('the-worst-person', 'drama'),
  ('the-last-of-us', 'drama'), ('the-last-of-us', 'survival'),
  ('the-lighthouse', 'horror'), ('the-lighthouse', 'drama'),
  ('moonlight', 'drama'), ('moonlight', 'coming-of-age'),
  ('triangle-of-sadness', 'satire'), ('triangle-of-sadness', 'comedy')
) as v(title_id, genre_slug) join public.genres g on g.slug = v.genre_slug
on conflict do nothing;
