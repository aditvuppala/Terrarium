# Terrarium

Helps University of Michigan students choose Ann Arbor housing based on their own priorities.

## Run it

```bash
cp .env.example .env.local   # mocks are on by default; no API key needed
npm install
npm run dev                  # http://localhost:3000
npm run build                # type-check + production build; must pass before merging
```

Requires Node 20+. No database, auth, or deployment config yet.

## The contract rule

**`lib/schemas.ts` is the single source of truth for every data shape.**

- Every API route validates its request **and** its response with these Zod schemas
  (`lib/api.ts` → `jsonOk` / `jsonError`).
- The frontend parses API responses with the same schemas.
- Don't redeclare these types anywhere else. Import them from `@/lib/schemas`.
- Changing `lib/schemas.ts` needs agreement from both owners and goes in its own commit.
- Unknown facts are `null` or `"unknown"`. Never fill in made-up values for real listings.

## Who owns what

| Area | Owner | Paths |
| --- | --- | --- |
| Shared contract | **both** | `lib/schemas.ts` |
| Pages and UI | frontend | `app/page.tsx`, `app/onboarding/`, `app/explore/`, `components/**`, `lib/store.ts` |
| API and logic | backend | `app/api/**`, `lib/data.ts`, `lib/rank.ts`, `lib/confidence.ts`, `lib/gemini.ts`, `lib/api.ts` |
| Data and mocks | backend | `data/**`, `mocks/**` |

Frontend can build against the mocks while backend replaces the stubs; neither side waits on the other.

## API (all JSON unless noted)

| Route | Request | Response | Skeleton behavior |
| --- | --- | --- | --- |
| `POST /api/rank` | `RankRequest` | `RankResponse` | Stub ranker (50% closeness to Central Campus, 50% cheapness). Quarantined listings are removed. |
| `POST /api/chat` | `ChatRequest` | `ChatResponse` | Returns `mocks/chat.json` when `NEXT_PUBLIC_USE_MOCKS=true` or `GEMINI_API_KEY` is unset; otherwise `501`. |
| `POST /api/backpack` | multipart, field `image` | `BackpackResponse` | `{ courses: [], warnings: ["Not implemented"] }` |
| `GET /api/listings/[id]` | n/a | `ListingDetailResponse` | Listing + enrichment, or `404` (also `404` for quarantined). |

Errors are always `{ error: string, details?: unknown }` (`ApiErrorSchema`).

## Data

- `lib/data.ts` is the only module that reads data. It exposes `getActiveListings`, `getListing`,
  `getEnrichment`, and `getBuildings`, currently backed by `data/seed/*.json`. To swap in a DB,
  change the `repo` implementation there and nothing else.
- `data/seed/listings.json` has 3 real listings (U-M Off-Campus Housing, retrieved 2026-11-19;
  coordinates are approximate) and 3 synthetic ones (`isSynthetic: true`, names end in "(mock)").
  One synthetic listing is `scam.status: "quarantined"` and must never reach the UI.
- `data/seed/enrichment.json` has placeholder numbers. Commute minutes are straight-line estimates.
- `data/majors.json` maps ~30 majors to `"north"` or `"central"` campus.

## Env

| Var | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-only. Read in `lib/gemini.ts`. |
| `GEMINI_MODEL` | Server-only. Model id for Gemini. |
| `NEXT_PUBLIC_USE_MOCKS` | `true` → `/api/chat` serves the canned mock. |

## Gotchas

- Leaflet uses `window`, so it is loaded only via `next/dynamic(..., { ssr: false })` inside a client
  component (`components/map/MapPanel.tsx`). Don't import `react-leaflet` from a server component.
- In zustand selectors, don't return a fresh `[]`/`{}` fallback (e.g. `s.x ?? []`). Use a module-level
  constant, or React loops forever.
- This is Next.js 16 with Cache Components on. Check `node_modules/next/dist/docs/` before relying on
  older Next.js patterns (see `AGENTS.md`).
