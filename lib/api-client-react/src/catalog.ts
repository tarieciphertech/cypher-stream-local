import {
  CatalogResponse,
  CatalogTitleDetail,
} from "@workspace/api-zod";
import { customFetch } from "./custom-fetch";

export type CatalogQuery = {
  type?: "film" | "series";
  genre?: string;
  q?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
};

const toQueryString = (params: CatalogQuery) => {
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.genre) query.set("genre", params.genre);
  if (params.q) query.set("q", params.q);
  if (params.featured) query.set("featured", "true");
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  const value = query.toString();
  return value ? `?${value}` : "";
};

export async function getCatalog(params: CatalogQuery = {}) {
  const data = await customFetch<unknown>(`/api/catalog${toQueryString(params)}`, {
    responseType: "json",
  });
  return CatalogResponse.parse(data);
}

export async function getTitle(id: string) {
  const data = await customFetch<unknown>(`/api/titles/${encodeURIComponent(id)}`, {
    responseType: "json",
  });
  return CatalogTitleDetail.parse(data);
}
