# Terrarium build prompts

How to use this file:
1. **One person** creates the GitHub repo, puts `schemas.ts` at `lib/schemas.ts`, runs **Prompt 0**, checks that `npm run dev` and `npm run build` pass, and pushes to `main`.
2. The other person clones it. Each of you branches off `main` (`frontend`, `backend`). Frontend pastes **Prompt A** into their AI tool and backend pastes **Prompt B** into theirs.
3. Merge into `main` often with small PRs. Since the folders don't overlap (frontend: `app/` pages, `components/`, `lib/store.ts`; backend: `app/api/`, `lib/` everything else, `scripts/`, `data/`), merge conflicts should be rare.
4. `lib/schemas.ts` is the contract. Any change to it goes in its own PR that both of you look at before merging.
5. Commit `.env.example`, never `.env.local` (that's where the Gemini key goes). Add `data/terrarium.db` and `data/cache/` to `.gitignore`. Each person rebuilds them with `npm run db:build`.

---

## Shared context (already included in each prompt below)

- **Product:** Terrarium, a website that helps University of Michigan students choose Ann Arbor housing based on their own needs. Built for the "Hack the Lease" hackathon. Judges score: working technical artifact 35%, student value 30%, decision quality and evidence 20%, UX 15%. Must show that changing an input changes the result. Must cite data sources and label simulated data.
- **Stack:** Next.js (App Router) + TypeScript, Tailwind, react-leaflet + OpenStreetMap tiles, Zod, SQLite (better-sqlite3 + Drizzle), Google Gemini via `@google/genai`. Runs locally only.
- **Core principle:** the LLM extracts and explains; deterministic code ranks. Gemini turns chat text and screenshots into `ProfilePatch` / `Course[]` JSON and writes scam explanations. `lib/rank.ts` produces every score so results are repeatable and explainable.
- **Data:** about 50 listings. Real ones come from the U-M Off-Campus Housing site and the rest are synthetic. Every listing carries `provenance.isSynthetic`, and the UI shows "Real listing" or "Mock listing" on every pin and card. About 5 synthetic listings are deliberate scams to demo the filter.

---

## Prompt 0: Skeleton (one person runs it, then pushes to GitHub)

```
You are setting up the skeleton for "Terrarium", a hackathon web app that helps
University of Michigan students choose Ann Arbor housing based on their own
priorities. Two developers will build frontend and backend in parallel after
this, so the most important output is a clean, compiling skeleton with a
shared contract and working mocks. Do NOT build real features yet.

STACK (do not substitute):
- Next.js App Router + TypeScript (strict), Tailwind CSS
- react-leaflet + OpenStreetMap tiles (Leaflet must be loaded with
  next/dynamic and ssr:false)
- zod for all data shapes
- zustand for client state
- No database yet: read JSON files through a repository module (below)
- No auth, no deployment config. Runs locally with `npm run dev`.

SHARED CONTRACT:
- lib/schemas.ts already exists. Use it verbatim. Do not edit it. Every API
  route validates its input and output with these Zod schemas.

CREATE THIS STRUCTURE:
app/
  page.tsx                  welcome: "Just browse" vs "Help me narrow it down"
  onboarding/page.tsx       2-step stepper: year, then major (stub UI is fine)
  explore/page.tsx          60/40 split: map left, chat panel right (stubs)
  api/rank/route.ts         POST RankRequest -> RankResponse
  api/chat/route.ts         POST ChatRequest -> ChatResponse
  api/backpack/route.ts     POST multipart image -> BackpackResponse
  api/listings/[id]/route.ts GET -> ListingDetailResponse
components/                 empty folders: map/, chat/, listing/, onboarding/
lib/
  schemas.ts                (provided)
  data.ts                   repository interface:
                              getActiveListings(): Promise<Listing[]>
                              getListing(id): Promise<Listing | null>
                              getEnrichment(id): Promise<ListingEnrichment | null>
                              getBuildings(): Promise<UMBuilding[]>
                            Implementation for now: read data/seed/*.json.
  rank.ts                   export function rank(profile, listings, enrichments): RankResponse
                            Stub: score = closeness to Central Campus (42.2770,
                            -83.7382) + cheapness, 50/50. Fill criteria[] with
                            "commute" and "cost". Must already return valid
                            RankResponse.
  confidence.ts             export function confidence(profile): {value, hint}
                            Stub: 10 + 15 if major + 15 if budgetMax.
  gemini.ts                 thin wrapper; reads GEMINI_API_KEY and GEMINI_MODEL
                            from env. Not called yet.
  store.ts                  zustand store: profile (UserProfile, starts as
                            DEFAULT_PROFILE), messages, rankResponse,
                            selectedListingId, chatOpen.
data/
  seed/listings.json        6 example listings matching Listing schema
                            (3 isSynthetic:false using the addresses below, 3
                            isSynthetic:true). One synthetic one has
                            scam.status "quarantined".
  seed/enrichment.json      matching ListingEnrichment for each (fake numbers OK)
  seed/buildings.json       5 U-M buildings (BBB, Duderstadt Center, Mason Hall,
                            Angell Hall, Ross School of Business) with approximate coords
  majors.json               [{ "name": string, "campus": "north"|"central" }]
                            ~30 majors
mocks/
  chat.json                 a canned ChatResponse
.env.example                GEMINI_API_KEY=, GEMINI_MODEL=, NEXT_PUBLIC_USE_MOCKS=true
.gitignore                  Next.js defaults + .env.local, data/terrarium.db, data/cache/
README.md                   how to run; who owns which folders; contract rule

Real seed addresses (from U-M Off-Campus Housing, retrieved 2026-11-19):
- 324 E Jefferson St, Ann Arbor 48104: $1,100–$1,799, studio–2 bed
- 414 S Division St, Ann Arbor 48104: $1,350–$2,200, studio–2 bed
- 2025 S Huron Pkwy (Eastwind Apartments), Ann Arbor 48104: $1,575–$1,940, 1–2 bed
Unknown fields use "unknown" / null, never invented values.

API BEHAVIOR FOR THE SKELETON:
- /api/rank: validate request, call lib/rank.ts with data from lib/data.ts,
  filter out scam.status === "quarantined", validate response, return.
- /api/chat: if NEXT_PUBLIC_USE_MOCKS=true or no GEMINI_API_KEY, return
  mocks/chat.json. Otherwise return 501 for now.
- /api/backpack: return { courses: [], warnings: ["Not implemented"] }.
- /api/listings/[id]: return listing + enrichment or 404.

UI FOR THE SKELETON (barebones, unstyled is fine):
- Welcome page buttons route to /explore and /onboarding.
- Explore page: Leaflet map centered on Ann Arbor (42.2808, -83.7430, zoom 14)
  with one marker per ranked result showing its score; clicking a marker sets
  selectedListingId and shows name + score + "Real listing"/"Mock listing"
  in a side card. Right 40%: chat panel with a message list and an input that
  calls /api/chat and appends the reply.
- After any profile change, POST /api/rank and re-render markers.

DEFINITION OF DONE:
- `npm install && npm run dev` works with zero errors and `npm run build`
  passes type-checking.
- Welcome -> Explore shows 5 markers (quarantined one hidden).
- Sending a chat message shows the mock reply.
- Every route's input/output passes its Zod schema.
Stop there. Summarize what you created and anything you were unsure about.
```

---

## Prompt A: Frontend branch

```
You are the frontend developer on "Terrarium", a Next.js + TypeScript +
Tailwind app that helps U-M students choose Ann Arbor housing. The skeleton
exists. lib/schemas.ts is the shared contract with the backend developer:
import types from it and NEVER edit it. Only work in app/ (pages, not
app/api), components/, lib/store.ts, and styles. Use mocks (NEXT_PUBLIC_USE_MOCKS)
until the backend routes are real; the API shapes will not change.

LOOK AND FEEL: calm, trustworthy, "terrarium" theme. Pale sage background
(#F3F5EF), deep ink text (#16241B), moss accent (#2F6B47). Headings in
Bricolage Grotesque, body in Inter. Rounded cards, no gradients, no emoji,
44px minimum touch targets, WCAG AA contrast, real <button>/<label> elements.

BUILD:

1. Welcome (/): logo + one-line pitch + two large choices:
   "Help me narrow it down" -> /onboarding, "Just browse" -> /explore.
   Small note: "We only use what you tell us. Nothing is stored."

2. Onboarding (/onboarding), one question per screen with a progress bar:
   a. "What year are you?" pill buttons -> profile.year
   b. "What's your major?" text input that filters data/majors.json live in a
      dropdown GROUPED under "North Campus" and "Central Campus" headers.
      Picking one sets profile.major and profile.majorCampus. If nothing
      matches, allow "Use '<typed>'" with majorCampus null.
   c. Then go to /explore.

3. Explore (/explore): header + 60/40 split (stacks vertically under 1000px).
   HEADER:
   - Fit confidence meter: label, percentage, progress bar, and the
     confidenceHint string, all from RankResponse.
   - "Your priorities" strip: profile.priorities sorted by rank as numbered
     chips (1. Commute 2. Cost ...), each showing its note if present and a
     dealbreaker icon if dealbreaker. Chips are drag-to-reorder; reordering
     rewrites ranks with source "user_reordered" and triggers re-rank.
     (This is our live "decision sensitivity" demo, so make it smooth.)
   - Footer/credits link: "Listings: U-M Off-Campus Housing + labeled mock
     data · Transit data provided by permission of AAATA/TheRide · U-M
     Transit Services GTFS · © OpenStreetMap contributors".

   MAP (60%): react-leaflet with OSM tiles. One marker per ScoredListing:
   a pill showing score; top 3 filled with accent; selected marker dark and
   enlarged. Marker shape or ring distinguishes real vs mock. Clicking a
   marker opens the detail card (overlay on the map, right side, scrollable).
   Optional layer toggles: bus stops, the user's places, the user's class
   buildings.

   DETAIL CARD (GET /api/listings/[id] for enrichment):
   - Photo carousel (photos[] urls with credit line), name, address
   - Badges: "Real listing" or "Mock listing"; lease type; beds/baths/sqft
     (show "Not listed" for nulls); price + priceBasis; "Rent negotiable:
     yes/no/unknown"; scam.level "medium" shows a warning badge with reasons
   - Score + rank + headline
   - Criteria list in priority order: icon for met / partial / unmet /
     unknown, label, detail string, small dataQuality tag
     ("estimated", "synthetic"...). Then a "Doesn't fully fit" section
     listing shortfalls[] verbatim. Never hide shortfalls.
   - Getting around: user's course buildings with walk/bus minutes
     (buildingTimes filtered to profile.courses), nearest bus stops with
     route names and headsigns ("Bursley-Baits → North Campus")
   - Nearby: places filtered to profile.placeCategories only, grouped by
     category, with walk minutes. If no categories chosen yet, show a
     button that asks the chat to ask about it.
   - Source line: provenance.sourceName, link, retrievedAt.

   CHAT (40%), collapsible to a slim right rail (rail shows a chat icon and
   "N questions left"):
   - Message list (assistant left, user right), newest at bottom.
   - nextQuestion.text as an assistant bubble with quickReplies as chips;
     clicking a chip sends it as a user message.
   - Free-text input + send button (Enter sends).
   - "Upload Backpack screenshot" button: POST image to /api/backpack,
     merge returned courses into profile.courses, then show them as a
     confirmable list ("We read these classes. Correct?"), with edit/remove
     and a text box to type courses for this term and next term.
   - On every ChatResponse: append reply, apply profilePatch to the
     profile (priorities REPLACES the list if present), then re-rank.

4. State & data flow (lib/store.ts): profile lives in memory only. Any
   profile change -> debounce 250ms -> POST /api/rank -> store
   RankResponse. If nearMissesOnly is true, show a banner: "Nothing meets
   all your dealbreakers. These are the closest matches."

DONE WHEN: full flow works on mocks; reordering priorities visibly
reshuffles pins; every listing shows real/mock and its shortfalls; no
TypeScript errors; layout works at 1440px and 390px wide.
```

---

## Prompt B: Backend branch

```
You are the backend developer on "Terrarium", a Next.js + TypeScript app that
helps U-M students choose Ann Arbor housing. The skeleton exists.
lib/schemas.ts is the shared contract with the frontend developer: use it,
NEVER edit it. Work only in app/api/, lib/ (except store.ts), scripts/,
data/. Everything heavy is precomputed by scripts; API routes only read
SQLite and run deterministic code (plus Gemini in /api/chat and
/api/backpack). Runs locally only.

PART 1: DATABASE
- SQLite via better-sqlite3 + Drizzle at data/terrarium.db.
- Tables: listings (one row per Listing; arrays/objects as JSON columns),
  enrichment (per listing), buildings, gtfs_stops, gtfs_stop_routes,
  places. Swap lib/data.ts to read from SQLite; keep its interface.
- Script `npm run db:build` rebuilds everything from data/ in one go.

PART 2: INGESTION PIPELINE (scripts/, run in this order)
1. scrape-um.ts: Playwright scrape of offcampushousing.umich.edu
   (JavaScript-rendered). FIRST read its robots.txt and terms; if they forbid
   automated access, stop and print a message so we enter listings by hand
   instead. Otherwise: max 40 listings, 1 request every 2+ seconds. Extract
   every Listing field you can; anything not stated becomes "unknown"/null,
   never a guess. Store photo URLs (no downloading) with credit
   "via U-M Off-Campus Housing". Do not store landlord names/phones/emails.
   provenance: { sourceName: "U-M Off-Campus Housing", sourceUrl, retrievedAt,
   isSynthetic: false }. Output data/raw/um.json.
2. normalize.ts: use Gemini to parse each description into structured fields
   the page doesn't expose (rentNegotiable, leaseType, leaseStart/End,
   furnished, utilitiesIncluded, parking, pets, laundry). Gemini may only use
   text in the description; otherwise "unknown". Validate with Zod.
3. synthetic.ts: generate listings to reach 50 total, isSynthetic: true,
   sourceName "Synthetic (Terrarium team)". Realistic Ann Arbor addresses
   and prices near the real ones' distribution, spread across Central,
   North, Kerrytown, Burns Park, Lower Town, Packard, and farther out.
   Include ~6 subleases and exactly 5 deliberate scams (below-market price,
   "I'm abroad, keys mailed", wire/Zelle/gift-card deposit, reused
   description, urgency). Use placeholder photos.
4. geocode.ts: US Census Geocoder (no key) for any listing missing lat/lng;
   fallback Nominatim at <=1 req/s with a descriptive User-Agent. Cache
   results in data/cache/geocode.json. Fail -> scam rule R6.
5. scam-check.ts: run deterministic rules, then Gemini.
   Rules (ruleHits ids):
   R1 rent < 60% of the median rent for the same bedroom count
   R2 payment red flags: wire, Western Union, gift card, crypto, Zelle/Venmo
      deposit before viewing
   R3 "out of the country/abroad/missionary/military deployment", "can't
      show", "keys mailed"
   R4 description or photo URL duplicated on a listing at a different address
   R5 pressure/off-platform: "deposit today", "first come first served",
      "text me at" + urgency
   R6 address doesn't geocode to Ann Arbor
   Then send Gemini: the listing, ruleHits, and comparable median rent.
   Ask for JSON {score 0..1, reasons[]}. Final score = max(rule score,
   Gemini score), where rule score = min(1, 0.35 * number of hits).
   level: <0.4 low, <0.7 medium, >=0.7 high. status "quarantined" when
   high (hidden from map, kept in DB with reasons). Never delete.
6. enrich.ts: for each listing:
   - stops: load TheRide GTFS (https://www.theride.org/sites/default/files/google/google_transit.zip)
     and U-M Transit Services GTFS (download from transit.land or Mobility
     Database; save in data/gtfs/). Join stops -> stop_times -> trips ->
     routes; keep the 5 nearest stops within 800 m, with route names and
     distinct trip_headsigns.
   - places: one Overpass API query for the Ann Arbor bounding box
     (amenity=bar|pub|restaurant|cafe|fast_food, shop=supermarket|grocery,
     leisure=fitness_centre), cached in data/cache/places.json. Keep those
     within 1 km of each listing, mapped to PlaceCategory.
   - buildingTimes: to every building in data/um-buildings.json. walkMin =
     haversine * 1.3 / 80 m per min. busMin = nearest-stop walk + 8 min
     average wait + ride at 20 km/h + walk from stop, only if walk > 20
     min, else null. method "estimate". (Upgrade to OSRM later if time.)
7. data/um-buildings.json: ~50 major U-M buildings (code, name, campus,
   lat, lng), entered by hand or from OpenStreetMap; cite the source in a
   comment field in the README.
   data/course-buildings.json: subject prefix -> most likely building code
   (e.g. EECS -> BBB), used only to GUESS a building when unknown.

PART 3: lib/rank.ts (deterministic; this is what judges will question)
For each ACTIVE listing, score every priority in profile.priorities:
- commute: targets = profile.courses buildings (any source; confirmed
  counts 2x) + frequentPlaces with coords; if none, campus centroid of
  majorCampus; if none, Central Campus. Minutes per target = walk if
  <=20 else (hasCar ? drive estimate : busMin). avg -> score =
  clamp(1 - (avg-5)/35). met <=15, partial <=25, else unmet.
  dataQuality "estimated".
- cost: share = rentMin / min(roommates+1, bedsMax) for per_unit, rentMin
  for per_bed/per_room; priceBasis unknown -> treat as per_unit and say so
  in detail. monthly = share + $90 utilities (assumption; $50 if
  utilitiesIncluded non-empty) + $110 parking if hasCar and parking != yes.
  With budgetMax: met if <= budget, partial if <= budget+150, else unmet;
  score = <=budget ? 0.85 + 0.15*(budget-monthly)/budget :
  max(0, 0.85 - (monthly-budget)/500). Without budget: score = 1 -
  percentile of monthly among active listings.
- roommates: met if bedsMin <= roommates+1 <= bedsMax, else unmet. Skip if
  roommates null.
- nearby_places: score = share of profile.placeCategories with >=1 place
  within 10 min walk. Skip if none chosen.
- transit_access: nearest stop walkMin; score = clamp(1 - (min-2)/12);
  detail lists route names.
- parking / furnished / pets / in_unit_laundry: yes -> 1 met, no -> 0
  unmet, unknown -> 0.5 status "unknown" with detail "Listing doesn't say".
  (pets only scored if hasPet; furnished only if wantsFurnished set.)
- lease_fit: leaseTypePref matches (either = match) and leaseStart <=
  moveInBy; unknowns -> 0.5 "unknown".
- space: bedsMax and sqft vs roommates+1; nulls -> unknown.
Weights: weight = 2^-(rank-1). This makes higher priorities clearly
dominate, which is how we honor "focus on higher priorities".
score = round(100 * sum(w*s) / sum(w)).
Dealbreakers: passesDealbreakers = no dealbreaker criterion has status
"unmet" (unknown passes but appears in shortfalls). Sort passes first,
then score desc, then rentMin asc. If none pass, return all and set
nearMissesOnly = true.
shortfalls: one plain sentence for every partial/unmet/unknown criterion,
e.g. "$140/mo over your budget", "About 28 min by bus to BBB",
"Listing doesn't say if pets are allowed". headline: rank + strongest
reason + biggest shortfall.
Synthetic listings: set dataQuality "synthetic" on criteria using their
listed facts.
Write unit tests (vitest) with 2 profiles: North Campus CS sophomore
(no car, $1,200, 1 roommate) vs Central Campus Econ junior (car, $1,800,
solo, bars + restaurants). Assert their top 3 differ, and that moving
"cost" from rank 2 to rank 1 changes the CS profile's ranking.

PART 4: lib/confidence.ts
value = 10 + major 15 + year 5 + courses (confirmed 20 / unconfirmed or
guessed 10) + budgetMax 15 + roommates 10 + hasCar 5 + placeCategories 5 +
user-set priorities (any source chat/user_reordered) 10 + frequentPlaces 5,
capped at 100. hint names the single highest-value missing item.

PART 5: /api/chat (Gemini)
- Server picks the next missing field deterministically, in this order:
  campus confirmation (from major), classes (offer Backpack screenshot
  upload or typing), budgetMax, roommates, hasCar, placeCategories (ASK
  which kinds of places matter; never assume), top-3 priority ranking +
  dealbreakers, then furnished / pets / leaseTypePref / moveInBy /
  frequentPlaces.
- Gemini system prompt: you are Terrarium's housing assistant for U-M
  students. Extract ONLY what the user said into profilePatch (schema
  given). Never infer demographics or sensitive traits. If the user names
  what matters most, set priorities with ranks and their words in note;
  "must"/"can't" -> dealbreaker true. If year+major are known and courses
  are empty, you may propose likely buildings as source "guess",
  confirmed false, and ask the user to confirm. Reply in 1-3 sentences,
  then ask nextQuestion (phrase the field the server chose) with 2-5
  quickReplies. Never invent facts about listings.
- Use responseMimeType "application/json" with a response schema; if the
  SDK rejects the generated schema, describe the JSON shape in the prompt
  instead. Always validate with Zod; on failure retry once, then fall back
  to { reply: "Sorry, could you rephrase that?", profilePatch: {},
  nextQuestion: <deterministic question> }.
- GEMINI_MODEL comes from env (pick a current Flash model in Google AI
  Studio); never hardcode the key.

PART 6: /api/backpack (Gemini vision)
- Accept an image upload (<=5 MB, png/jpg). Ask Gemini to list course
  codes, which term each is for if visible, and building/room if visible.
  For courses with no building, fill from data/course-buildings.json with
  source "guess". Everything returned has confirmed: false. Add a warning
  for anything unreadable. Don't store the image.

DONE WHEN: `npm run db:build` produces 50 listings (real + synthetic, 5
quarantined scams with reasons), every listing has enrichment, rank tests
pass, /api/chat and /api/backpack work with a real GEMINI_API_KEY, and all
routes validate against lib/schemas.ts.
```

---

## Open items to fill in during the build

- The ~50 entries in `data/um-buildings.json` (coordinates from OpenStreetMap or entered by hand).
- `data/course-buildings.json` guesses (subject → building). These are always labeled "guess" in the UI.
- Check the U-M Off-Campus Housing site's terms before running the scraper.
- Pick the Gemini model name in Google AI Studio.
