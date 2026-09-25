const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const readOptionalEnv = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimTrailingSlash(trimmed) : undefined;
};

const environment = import.meta.env.VITE_APP_ENV ?? "development";
const configuredApiBaseUrl = readOptionalEnv(import.meta.env.VITE_API_URL);

export const appConfig = Object.freeze({
  environment,
  apiBaseUrl:
    configuredApiBaseUrl ??
    (environment === "production" ? "https://api.cyphertech.co.zw" : undefined),
  mediaBaseUrl: readOptionalEnv(import.meta.env.VITE_MEDIA_BASE_URL),
});

export type AppConfig = typeof appConfig;
