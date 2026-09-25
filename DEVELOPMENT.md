# Cypher Stream Development Guide

## Package manager

This repository is a pnpm workspace. Run commands with pnpm; the root preinstall script intentionally rejects npm/yarn installs.

## Frontend

```bash
pnpm --filter @workspace/cypher-stream typecheck
pnpm --filter @workspace/cypher-stream build
```

Development server:

```bash
pnpm --filter @workspace/cypher-stream dev
```

## Workspace checks

```bash
pnpm typecheck
pnpm build
```

The root build performs TypeScript checks before recursively building workspace packages.

## Environment

Copy `artifacts/cypher-stream/.env.example` to the local environment used by the frontend tooling and set values appropriate for the environment.

`VITE_API_URL` is optional. Empty means the frontend calls the same-origin API paths already used by the prototype.

## Phase 1 workflow

For each refactor:

1. Identify the current behaviour that must be preserved.
2. Move one responsibility at a time.
3. Keep route URLs stable unless the route change is explicitly part of the phase.
4. Type-check the affected workspace.
5. Build the affected workspace.
6. Only then remove confirmed dead code.

## Prototype data

`artifacts/cypher-stream/src/data.ts` is temporary prototype content. It is not the production catalog and should not be expanded with fabricated content. Phase 2 will replace it with API/database-backed content.

## Generated API code

Files under `lib/api-client-react/src/generated/` are generated from the API specification. Update the API spec and generation process instead of hand-editing generated operations.
