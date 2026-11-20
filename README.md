# Terrarium

Helps University of Michigan students choose Ann Arbor housing based on their own priorities.
The LLM extracts and explains; deterministic code ranks (`lib/rank.ts`), so every score is repeatable and explainable.

## Run it

```bash
cp .env.example .env.local   # mocks are on by default; no API key needed
npm install
npm run db:build             # builds data/terrarium.db from data/ (offline, ~1 s; `npm run dev` does this if it's missing)
npm run dev                  # http://localhost:3000
npm test                     # ranking + chat unit tests (vitest)
npm run build                # type-check + production build; must pass before merging
```

Requires Node 20.6+ (developed on Node 24). Runs locally only: no auth, no deployment config.

To use Gemini, set `GEMINI_API_KEY` and `GEMINI_MODEL` (a current Flash model from Google AI Studio) in `.env.local`, and set `NEXT_PUBLIC_USE_MOCKS=false`.

## The contract rule

**`lib/schemas.ts` is the single source of truth for every data shape.**

- Every API route validates its request **and** its response with these Zod schemas (`lib/api.ts` → `jsonOk` / `jsonError`).
- The frontend parses API responses with the same schemas.
- Don't redeclare these types anywhere else. Import them from `@/lib/schemas`.
- Changing `lib/schemas.ts` needs agreement from both owners and goes in its own PR.
- Unknown facts are `null` or `"unknown"`. Never fill in made-up values for real listings.

## Who owns what

| Area | Owner | Paths |
| --- | --- | --- |
| Shared contract | **both** | `lib/schemas.ts` |
| Pages and UI | frontend | `app/page.tsx`, `app/onboarding/`, `app/explore/`, `components/**`, `lib/store.ts`, `public/` (except `public/photos/`) |
| API and logic | backend | `app/api/**`, `lib/` (except `store.ts`), `scripts/**` |
| Data and mocks | backend | `data/**`, `mocks/**`, `public/photos/` |

## Renter tools (sidebar on /explore)

The menu button on the explore page opens three tools. None of them store anything on our side.

| Route | What it does | Where the logic lives |
| --- | --- | --- |
| `/lease-check` | Upload a lease (PDF/photo) or try the sample. Gemini transcribes it and maps clauses to a **fixed list of verified rules** (MCL 554.602/.609/.613/.633/.634, Ann Arbor § 8:530 and § 8:532); every quote must appear verbatim in the text or it's dropped. Deposit and application-fee limits are checked by arithmetic. Mock mode uses `mocks/lease.json`. | `app/api/lease/route.ts`, `lib/lease/*` |
| `/deposit` | Room-by-room move-in/move-out photos and videos, SHA-256 fingerprinted, stored only in this browser (IndexedDB), exported as a zip with a manifest and a readable report. Michigan Security Deposit Act deadlines computed from the lease dates. | `components/tools/deposit/*`, `lib/deposit/*` |
| `/split` | Envy-free rent split from one round of bids: welfare-maximizing room assignment, then the midpoint of the envy-free price set (Bellman-Ford on difference constraints), rounded to cents. | `lib/split.ts` |

Each house view also lists **questions to ask the landlord**, generated from what the listing doesn't say (`lib/landlordQuestions.ts`).

**Day/night theme:** the landing page switch (and the small switch in every header) sets `<html data-theme>` and saves it on this device (`components/ui/theme.ts`). Other pages remap the palette classes in `app/globals.css`.

**Photos:** synthetic listings use six illustrated placeholders in `public/photos/` (labelled "Illustration · not the actual unit"). Real listings have none (the source site's terms restrict copying photos).

## API

All responses validate against `lib/schemas.ts`. Errors are `{ error: string, details?: unknown }`.

| Route | Request | Response | Notes |
| --- | --- | --- | --- |
| `POST /api/rank` | `RankRequest` | `RankResponse` | Active listings only (quarantined scams never appear). Deterministic. |
| `GET /api/listings/[id]` | n/a | `ListingDetailResponse` | 404 for unknown **and** quarantined ids. |
| `POST /api/chat` | `ChatRequest` | `ChatResponse` | Mock mode: canned reply, `{}` patch, but a **real** deterministic `nextQuestion`. |
| `POST /api/backpack` | multipart `image` (PNG/JPEG, ≤ 5 MB) | `BackpackResponse` | Mock mode: `mocks/backpack.json`. 415 wrong type, 413 too big. Image is never stored. |

**Mock mode** = `NEXT_PUBLIC_USE_MOCKS=true` **or** no `GEMINI_API_KEY`/`GEMINI_MODEL`. Ranking and listing data are always real.

### Notes for the frontend

- **Keep `nextQuestion.text` in the message history** you send back (as an assistant message). The server recognizes which questions it already asked from the history, so a skipped question is never asked twice.
- `profilePatch` uses replace semantics, and the server has already merged list fields: `courses`, `frequentPlaces` and `placeCategories` come back as the full merged list. `priorities`, when present, replaces the list.
- Course buildings with `source: "guess"` or `confirmed: false` should be shown as "please confirm".
- `criteria[].dataQuality`: `listed` (from a real listing), `synthetic` (from a mock listing), `estimated` (our computation, e.g. walk times), `missing` (listing doesn't say).

## How chat works (`lib/chat.ts`)

The server picks the next question deterministically, in this order: campus confirmation (from major) → classes (Backpack screenshot or typed) → budget → roommates → car → kinds of places nearby (asked, never assumed) → top-3 priorities + dealbreakers → furnished → pets → lease type → move-in date → frequent places. A field is asked only if it's still missing and hasn't been asked yet.

Gemini (via `lib/gemini.ts`) gets the history, the current profile, and the chosen field. It returns `{reply, profilePatch, nextQuestion}` as JSON (`responseJsonSchema` from the Zod schema; if the API rejects the schema, the shape is described in the prompt instead). The output is always Zod-validated. On failure it retries once, then falls back to "Sorry, could you rephrase that?" with the deterministic question. The server cleans the patch before returning it: it drops nulls, merges lists, renumbers priority ranks, and checks building codes against `data/um-buildings.json`.

## Ranking (`lib/rank.ts`)

For each active listing, every priority in `profile.priorities` is scored 0–1 with a status (met / partial / unmet / unknown) and a plain-language detail.

- **weight = 2^-(rank−1)**: #1 counts 1, #2 counts 0.5, #3 counts 0.25. Higher priorities clearly dominate.
- **score = round(100 × Σ w·s / Σ w)**.
- **Dealbreakers**: a listing fails if a dealbreaker criterion is `unmet` (`unknown` passes but shows in shortfalls). Listings that pass come first, then score, then `rentMin`. If none pass, all are returned with `nearMissesOnly: true`.
- **Every partial / unmet / unknown criterion produces a shortfall sentence.** Nothing is hidden.

| Criterion | How it's scored |
| --- | --- |
| commute | Targets: course buildings (confirmed count 2×) + frequent places with coordinates; else the centroid of `majorCampus`; else Central Campus. Walk if ≤ 20 min, else drive (if `hasCar`) or bus. score = clamp(1 − (avg − 5)/35); met ≤ 15 min, partial ≤ 25. |
| cost | Your share = `rentMin` ÷ min(roommates + 1, bedsMax) for per-unit (unknown basis is treated as per-unit and says so); per-bed/room = `rentMin`. Plus utilities (assumed $90, or $50 if some are included) and parking ($110 if you have a car and none is included). With a budget: met ≤ budget, partial ≤ budget + $150. Without one: 1 − percentile. |
| roommates | met if bedsMin ≤ people ≤ bedsMax. Skipped if roommates unknown. |
| nearby_places | Share of your chosen place categories with one or more places within a 10-min walk. Skipped if none chosen. |
| transit_access | Nearest stop: score = clamp(1 − (walkMin − 2)/12). Detail lists route names. |
| parking / furnished / pets / in_unit_laundry | yes → 1, no → 0, unknown → 0.5 ("Listing doesn't say"). Pets only if `hasPet`; furnished only if `wantsFurnished` is set (false prefers unfurnished). |
| lease_fit | Lease type matches (`either` always matches) and `leaseStart` ≤ `moveInBy`; unknowns → 0.5. Skipped if neither preference is set. |
| space | Enough bedrooms for everyone, then sq ft per person vs 350 (assumption); missing sq ft → unknown. |
| construction | Nearest active city project (straight line to its area): ≤ 60 m → unmet ("on this block"), ≤ 200 m → partial (0.5), else met. Distances are `estimated`; projects come from a dated snapshot (see `data/processed/construction-source.json`). |

If no criterion can be scored (e.g. only "pets" with no pet), it falls back to the default commute + cost.

**Confidence** (`lib/confidence.ts`): 10 + major 15 + year 5 + courses (confirmed 20 / unconfirmed 10) + budget 15 + roommates 10 + car 5 + place categories 5 + user-set priorities 10 + frequent places 5, capped at 100. The hint names the single highest-value missing item.

## Data pipeline

`npm run db:build` is offline and deterministic. It loads the **committed** files in `data/processed/` and `data/um-buildings.json` into SQLite (`data/terrarium.db`, via better-sqlite3 + Drizzle; tables: `listings`, `enrichment`, `buildings`, `gtfs_stops`, `gtfs_stop_routes`, `places`). `lib/data.ts` reads from it.

To regenerate `data/processed/` (needs network; uses caches in `data/cache/`), run `npm run pipeline`. It runs these steps in order:

| Step | Script | Output |
| --- | --- | --- |
| 1 | `scrape-um.ts`: checks robots.txt + Terms of Use; **does not scrape** (see below) | n/a (validates `data/raw/um.json`) |
| 2 | `normalize.ts`: Gemini fills unknown fields from each description's text only (cached) | `real.json` |
| 3 | `synthetic.ts`: seeded mock listings to reach 50 total (6 subleases, exactly 5 deliberate scams) | `synthetic.json` |
| 4 | `geocode.ts`: US Census Geocoder, falling back to Nominatim (≤ 1 req/s); cached | `geocoded.json` |
| 5 | `scam-check.ts`: rules R1–R6, then Gemini; final = max(rule, Gemini); high → quarantined (kept, never deleted) | `listings.json` |
| 6 | `enrich.ts`: GTFS stops/routes/headsigns, Overpass places, building times | `enrichment.json`, `gtfs-stops.json`, `places.json` |
| 7 | `construction.ts`: City of Ann Arbor active construction projects within 250 m of each listing (cached in `data/cache/construction.geojson`; delete it to refresh) | `enrichment.json` (`construction`), `construction-source.json` |

Steps 2 and 5 call Gemini only when it's configured; without it, normalize leaves fields unknown and scam-check uses rules only. `npm run buildings` regenerates `data/um-buildings.json`.

### Real listings are entered by hand

The Terms of Use governing offcampushousing.umich.edu (RentCollegePads/StarRez, checked 2026-11-20) prohibit using "any robot, spider, or other automatic device, process, or means to access the Website for any purpose, including monitoring or copying any of the material." `robots.txt` also disallows listing-detail URLs (`?property_id=`). So `scrape-um.ts` stops and prints instructions instead of scraping.

To add a real listing, copy an entry in `data/raw/um.json` and fill in facts only. Unknown → `"unknown"`/`null`. Don't include landlord names, phones or emails. Leave `photos: []` (the terms also restrict copying photos) and write `description` in your own words or leave it `""`. Then run `npm run pipeline`. The number of synthetic listings adjusts automatically so the total stays 50.

### Scam rules (`scripts/scam-check.ts`)

R1 rent < 60% of the median for the same bedroom count (per-unit equivalent) · R2 wire / Western Union / gift card / crypto / Zelle-Venmo deposit · R3 owner abroad / missionary / deployed / can't show / keys mailed · R4 description or photo reused at a different address · R5 "deposit today", "first come first served", "text me at" + urgency · R6 address doesn't geocode to Ann Arbor. Rule score = min(1, 0.35 × hits). Level: < 0.4 low, < 0.7 medium, ≥ 0.7 high → quarantined.

## Data sources and credits

- **Listings**: U-M Off-Campus Housing (offcampushousing.umich.edu), facts entered by hand, retrieved 2026-11-19. All other listings are **synthetic** (`provenance.isSynthetic: true`, source "Synthetic (Terrarium team)"), with placeholder photos in `public/photos/`.
- **Transit**: TheRide (AAATA) GTFS, `theride.org/sites/default/files/google/google_transit.zip`. U-M Transit Services GTFS via the Mobility Database (feed `mdb-2072`). Walk/bus times are estimates (straight line × 1.3, 80 m/min walking, 8 min average wait, 20 km/h bus).
- **Construction**: City of Ann Arbor "Active Construction Projects" layer, the data behind [a2gov.org/A2ConstructionStatus](https://www.a2gov.org/A2ConstructionStatus) (ArcGIS FeatureServer; license not specified in the city's catalog). Retrieved 2026-11-20; projects marked "Project Complete" are dropped. The layer has no start/end dates, only the city's free-text description.
- **Places and building coordinates**: © OpenStreetMap contributors (ODbL), via the Overpass API.
- **Geocoding**: U.S. Census Bureau Geocoder; fallback Nominatim (OpenStreetMap).

**`data/um-buildings.json` source:** 54 U-M buildings. Coordinates are OpenStreetMap building centroids, matched by name (`scripts/buildings-osm.ts`), except DENN (Dennison Building) and DENT (School of Dentistry), which are hand-entered approximations. The per-building source is in `data/um-buildings.sources.json`. `data/course-buildings.json` maps subject prefixes to a likely building and is used **only** to guess (always `source: "guess"`, `confirmed: false`).

## Gotchas

- Leaflet uses `window`, so it is loaded only via `next/dynamic(..., { ssr: false })` inside a client component (`components/map/MapPanel.tsx`).
- In zustand selectors, don't return a fresh `[]`/`{}` fallback (e.g. `s.x ?? []`). Use a module-level constant, or React loops forever.
- Only one `next dev` server can run per project directory.
- This is Next.js 16 with Cache Components on. Check `node_modules/next/dist/docs/` before relying on older Next.js patterns (see `AGENTS.md`).
