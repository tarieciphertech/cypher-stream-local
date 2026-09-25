import { useQuery } from "@tanstack/react-query";
import { getCatalog, type CatalogQuery } from "@workspace/api-client-react";
import type { Title } from "../../data";

const formatDuration = (minutes: number | null, mediaType: Title["type"]) => {
  if (minutes == null) return mediaType === "series" ? "Series" : "—";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours}h ${remaining}m` : `${remaining}m`;
};

export const mapCatalogTitle = (title: Awaited<ReturnType<typeof getCatalog>>["items"][number]): Title => ({
  id: title.id,
  name: title.name,
  eyebrow: title.releaseYear ? `${title.releaseYear} / ${title.mediaType}` : title.mediaType,
  year: title.releaseYear ?? 0,
  rating: title.maturityRating ?? "—",
  duration: formatDuration(title.runtimeMinutes, title.mediaType),
  type: title.mediaType,
  genres: title.genres.map((genre) => genre.name),
  description: title.synopsis ?? "",
  poster: title.posterUrl ?? "",
  backdrop: title.backdropUrl ?? "",
  accent: title.accent ?? "#c4e56b",
  badge: title.badge ?? undefined,
});

export function useCatalog(params: CatalogQuery = {}) {
  const query = useQuery({
    queryKey: ["catalog", params],
    queryFn: () => getCatalog(params),
    staleTime: 60_000,
  });

  const titles = query.data?.items.map(mapCatalogTitle) ?? [];
  const featuredTitle = titles.find((title) => query.data?.items.find((item) => item.id === title.id)?.featured) ?? null;

  return {
    ...query,
    titles,
    featuredTitle,
  };
}
