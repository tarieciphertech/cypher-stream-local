# Cypher Stream Architecture

## Current state

Cypher Stream is a pnpm workspace containing the web application, an Express API, and shared libraries. The web application currently contains the working prototype UI and prototype playback data. The API currently exposes the health endpoint and the database package is scaffolding for the future production schema.

## Phase 1 boundary

Phase 1 is a controlled refactor. Existing routes, visual behaviour, local saved-list behaviour, and prototype playback must remain functional while code ownership becomes clearer.

### Frontend

```text
artifacts/cypher-stream/src/
├── app/              # application bootstrap and configuration
├── components/       # reusable presentation components
├── pages/            # route-level screens
├── features/         # domain behaviour introduced incrementally
├── lib/              # frontend infrastructure and API boundary
├── types/            # shared frontend domain types
├── App.tsx           # temporary composition root during Phase 1
└── data.ts           # temporary prototype catalog; replaced in Phase 2
```

`App.tsx` remains the composition root until its existing UI is split into smaller files. This avoids a large, risky rewrite while the prototype is still the reference implementation.

### API

```text
artifacts/api-server/src/
├── app.ts
├── routes/
│   └── index.ts
└── ...
```

The API boundary is `/api`. New domain endpoints should be added behind route modules rather than directly inside the Express bootstrap.

### Shared libraries

```text
lib/
├── api-client-react/   # generated client + HTTP transport
├── api-spec/           # OpenAPI source
├── api-zod/            # API validation/types
└── db/                 # future database schema and access layer
```

The generated API client must remain generated. Application-specific API hooks/services should wrap generated operations rather than editing generated files manually.

## Runtime configuration

The web app reads:

- `VITE_APP_ENV` — `development` or `production` style environment label.
- `VITE_API_URL` — optional API origin. When omitted, requests remain same-origin (`/api/...`).
- `VITE_MEDIA_BASE_URL` — optional media origin reserved for the future media service.

Configuration is centralized in `artifacts/cypher-stream/src/app/config.ts` and initialized once by `main.tsx`.

## Target architecture

```text
Web / Admin
    │
    ▼
Frontend feature layer
    │
    ▼
API client
    │
    ▼
Cypher Stream API
    ├── Catalog
    ├── Users
    ├── Watchlist / Progress
    ├── Search
    ├── Playback authorization
    └── Admin
    │
    ├── Supabase PostgreSQL (metadata)
    └── Media platform (assets / HLS)
```

## Phase sequence

1. **Phase 1 — Audit / Stabilise:** clean boundaries without changing product behaviour.
2. **Phase 2 — Real backend:** replace hard-coded catalog data with database-backed APIs.
3. **Phase 3 — Admin Studio:** production content and media management.
4. **Phase 4 — Streaming infrastructure:** authorization, media origin, transcoding and HLS.
5. **Phase 5 — Production infrastructure:** domain, CDN/reverse proxy, origin/storage and future live-streaming capacity.

## Refactor rules

- Do not delete prototype code until its usage has been verified.
- Do not replace working playback with a new media stack during Phase 1.
- Do not put API calls directly into presentational components.
- Do not edit generated API client files by hand.
- Keep prototype data clearly marked as temporary.
- Every Phase 1 change should be independently type-checkable/buildable.
