# OROVA — Discovery Map, Location-Aware Search & AI Land Assistant

**Status:** Proposed · **Created:** 2026-10-25 · **Owner:** [product owner]
**Inspiration:** [2bigha.ai](https://2bigha.ai) ("Har pata humein pata hai") — reference screenshots in chat.
**Relates to:** [PRD.md](PRD.md) (Phases 2–5), [tech-decisions.md](tech-decisions.md), [handover-spec.md](handover-spec.md).

> This is a **design + delivery plan**, built to be shipped **phase by phase**. Each phase is
> independently shippable and adds visible value. We adapt 2bigha's *ideas* to the OROVA brand and
> our existing stack (Next.js 16 · React 19 · MongoDB/Mongoose · Tailwind v4 · Leaflet) — we do not
> copy their branding, data or assets.

---

## 1. What we're adding (mapped from the reference)

| Reference feature (2bigha) | OROVA equivalent | Phase |
|---|---|---|
| India map with price pins, "305 Lands Found", list beside map | **Discovery Map** (map ↔ list, clustered price markers, filters) | 1 |
| "Search locations across India" + Agriculture/Price/Area/Status/Sale-by filters | **Map search + filter bar** (reuse + extend our filters) | 1 |
| Auto-location ("All India" selector, Pan-India) | **Location-aware arrival** (ask once, auto-filter to nearby) | 1 |
| Prominent **Login** / Google | **Welcome + Continue with Google** (we already have the OAuth flow) | 2 |
| "2Bigha Land Assistant" chat (search, FAQs, suggestions) | **OROVA Land Assistant** (Claude-powered search + guidance) | 3 |
| Property detail: **satellite map** + pin + boundary | **Satellite detail map** (+ optional boundary polygon) | 4 |
| Call Owner · WhatsApp · Share Profile · owner rating | **Owner contact actions** (privacy-aware) + rating | 4 |
| **Price Trends** (+96% / 6 yrs, district comparison) | **Indicative price insights** (from our aggregated data, clearly labelled) | 5 |
| Chat that *helps you list* a property | **AI listing intake** (conversational draft creation) | 6 |

---

## 2. Guardrails & product principles (carry over from the PRD)

- **Honest, not hype.** The AI assistant and price trends ship with a visible *"beta — verify prices,
  area and ownership before acting"* disclaimer (2bigha does this too). No fake "Verified".
- **Owner contact stays private by default.** 2bigha shows "Call Owner / WhatsApp" directly; our PRD
  keeps contact private and enquiry-gated. **Decision needed** (see §8) — default proposal: reveal
  contact (or open WhatsApp) **only after the user signs in and submits/accepts an enquiry**, logged
  as a lead. This preserves privacy + lead capture while feeling as direct as 2bigha.
- **No new paid dependency without sign-off.** Map + tiles use free/keyless sources; AI needs one key
  (Anthropic). See §7.
- **Every phase:** `tsc --noEmit` + `eslint` clean before commit; secret-scan on push.

---

## 3. Tech decisions (the "how")

### 3.1 Maps
- **Library:** **Leaflet** (already a dependency from the listing pin picker) + **marker clustering**
  (`leaflet.markercluster`) for the 20k-pin India view.
- **Tiles (free, keyless):**
  - Standard: OpenStreetMap (already used).
  - **Satellite:** Esri *World Imagery* raster tiles (free for light use, attribution required) — gives
    the 2bigha satellite look without a Mapbox token.
- **Mapbox GL** (what 2bigha uses) is the alternative for vector tiles + crisp price labels, but it
  needs a token and has usage-based billing. **Recommendation:** ship Phase 1 on Leaflet+Esri (₹0);
  revisit Mapbox only if the polish gap matters.
- **Price-label markers:** Leaflet `divIcon` pills ("₹30 L") like the reference; cluster into counts
  when zoomed out.

### 3.2 AI Land Assistant
- **Model:** Anthropic **Claude** (default to the latest — Opus 5.5 / Sonnet 5.5; `claude-sonnet-5-5`
  is the cost/latency sweet spot for this). Needs `ANTHROPIC_API_KEY`.
- **Pattern:** server-side **tool-use** loop. The model is given tools it can call:
  - `search_listings({ state?, city?, type?, priceMin?, priceMax?, areaMin?, near? })` → runs our
    existing `searchPublicListings`, returns compact cards.
  - `get_listing({ slug })` → details.
  - (Phase 6) `draft_listing({...})` → creates a DRAFT via the listing service.
- **Grounding:** the assistant answers **only** from our DB + a small curated FAQ ("what to check
  before buying", "how to check land records"). It never invents listings or legal guarantees.
- **Transport:** a `/api/v1/assistant/chat` route (Node runtime) that streams tokens; a floating chat
  widget + a full-screen `/assistant` page (both reuse the same endpoint).

### 3.3 Location-aware arrival
- Browser **Geolocation API** → reverse-geocode via our `/api/v1/geo/reverse` → set `state`/`city`
  filters + center the map. One-time ask, remembered in `localStorage` (never block browsing).
- **Fallback** when denied/unavailable: lightweight **IP geolocation** (free tier, e.g. ipapi) *or* a
  "choose your city" prompt. Default view = Pan-India if all else fails.

### 3.4 Price insights (Phase 5)
- We have **no historical price feed**. Be honest: compute **indicative** figures from *our own*
  published listings — e.g. median ₹/unit for the locality/district, and a coarse trend if we have
  enough dated listings. Labelled **"Indicative — based on OROVA listings, not a valuation."**
- Charting: **Recharts** (React) or a small inline SVG area chart to match the reference.
- This is explicitly PRD **Phase 5 (land intelligence)** territory — ship a modest, honest version.

### 3.5 Data-model additions
- `Listing.location.boundary` — optional GeoJSON Polygon (owner-drawn plot outline).
- `Listing.aggregates` — optional cached locality price stats (computed job, Phase 5).
- `OwnerRating` — optional (ratings for owners), or embed a simple average on the user.
- `AssistantSession` — optional, to persist chat history (can start stateless).

---

## 4. Phased delivery plan

### Phase 1 — Discovery Map + location-aware search  *(the headline experience)*
**Goal:** an India map of all published listings with price pins, a synced results list, filters, and
a one-time "use your location" that auto-filters to nearby.
- `/map` route: left = Leaflet India map (clustered ₹-pins from published listings' lat/lng); right =
  results list (reuse `ListingCard`/list rows). Clicking a pin highlights the card and vice-versa.
- Filter bar: type (Land/Residential/Commercial/Agri), price, area, status, sale-by — driven by the
  URL (shareable), reusing `searchPublicListings`.
- "N lands found" + sort (newest, price). Map pans → refetch markers in view (bbox query via
  `2dsphere`).
- **Location arrival:** on first visit, prompt geolocation → reverse-geocode → set filters + center.
- Add a **"Map" entry** to the nav and a "View on map" CTA on the landing.
- *Deps:* `leaflet.markercluster`; a listings geo/bbox API (`/api/v1/listings/map`).

### Phase 2 — Welcome & Google login on arrival
- A dismissible welcome modal on first visit: value prop + **Continue with Google** (existing flow) +
  "Browse as guest". Remember dismissal; never hard-gate browsing.
- Surface the location ask here too (combine with Phase 1's prompt for one clean onboarding moment).

### Phase 3 — OROVA Land Assistant (search + guidance)  ✅ **built 2026-10-25**
- Floating chat button (`AssistantWidget`, mounted site-wide via `AppChrome`), Claude-powered with
  tool-use `search_listings` / `get_listing_details`, listing cards rendered inline, suggested prompts.
- Beta badge + "can make mistakes / verify on the listing" disclaimer. Grounded ONLY in DB results +
  a curated FAQ (never invents listings, no legal/investment guarantees, owner contact stays
  enquiry-gated).
- **Shipped:** `src/server/ai/assistant.ts` (model `claude-sonnet-5-5`, adaptive thinking, manual
  tool-use loop, `AiCounter` daily cost cap), `POST /api/v1/assistant/chat` (Node runtime), the widget.
- **To switch on:** set `ANTHROPIC_API_KEY` in `.env.local` + Vercel. Until then the endpoint returns a
  graceful "not switched on" message and the rest of the site is unaffected. `AI_DAILY_CAP` (0 = off)
  caps replies/day as a cost guard — set a number before public launch.
- *Non-streaming for v1* (replies are short, `max_tokens` 2048); revisit streaming if answers grow.

### Phase 4 — Property detail upgrades
- **Satellite map** block (Esri imagery) with the listing pin + optional **boundary polygon**;
  "Get directions" (opens Maps), "Satellite/Standard" toggle.
- **Owner contact actions:** Call / WhatsApp / Share — privacy-aware per §8 decision (enquiry-gated).
- **Owner rating** (display + "rate the owner" after an interaction).

### Phase 5 — Indicative price insights
- A "Price insights" card on the detail page: locality median ₹/unit, district comparison, a small
  trend chart — all clearly labelled **indicative**. Backed by a cached aggregates job.

### Phase 6 — AI listing intake (chat-to-listing)
- The assistant guides an owner through creating a listing conversationally, filling the
  `createListingSchema` and producing a **DRAFT** (human still reviews). PRD Phase 3.

---

## 5. Sequencing & estimates (relative)

1. **Phase 1** — largest; the core. (map API + `/map` UI + clustering + filters + geo arrival)
2. **Phase 2** — small. (modal + reuse Google)
3. **Phase 3** — medium. (assistant endpoint + chat UI + tools)
4. **Phase 4** — medium. (satellite + contact actions + rating)
5. **Phase 5** — medium. (aggregates job + chart)
6. **Phase 6** — medium/large. (conversational intake on top of Phase 3)

Ship 1 → 2 → 3 in that order for the biggest visible jump; 4–6 follow.

---

## 6. Success signals
- Map: time-to-first-relevant-listing drops; % sessions using the map; pins-in-view performance < 16ms.
- Assistant: % chats that surface ≥1 listing; enquiry rate from chat; "verify" disclaimer impressions.
- Location arrival: % granting location; bounce rate vs. Pan-India default.

---

## 7. Dependencies & config
- `leaflet.markercluster` (npm, free).
- Esri World Imagery tiles (free, attribution) — no key.
- `ANTHROPIC_API_KEY` (Phase 3+) — **user to provide**; set in `.env.local` + Vercel.
- Optional later: Mapbox token (only if we choose Mapbox), IP-geolocation key (only if the free tier
  isn't enough).
- Charting lib for Phase 5 (Recharts) — free.

---

## 8. Decisions (resolved 2026-10-25)
1. **Owner contact exposure** — ✅ **Enquiry-gated.** Call/WhatsApp revealed or routed only after the
   user signs in + submits an enquiry (logged as a lead). Keeps owner numbers private per the PRD.
2. **Map provider** — ✅ **Leaflet + Esri (free).** OSM + Esri World Imagery, `leaflet.markercluster`.
   No token, ₹0.
3. **AI model** — ✅ **`claude-sonnet-5-5`.** Needs `ANTHROPIC_API_KEY`; add a per-day call cap
   (reuse the OTP Layer-A pattern).
4. **Assistant scope first** — search + FAQ (Phase 3); listing-intake stays Phase 6.
5. **Price trends** — ship the honest "indicative from our listings" version in Phase 5.

---

## 9. Risks
- **Map performance** with thousands of pins → mitigate with clustering + bbox-limited fetch.
- **AI hallucination / bad advice** → strict tool-grounding, FAQ allow-list, visible beta disclaimer,
  no legal guarantees.
- **Price-trend credibility** → label indicative; never present as a valuation (PRD rule).
- **Privacy** (owner contact, location) → DPDP-aligned consent; location ask is opt-in and remembered.
- **Cost drift** (AI, Mapbox) → rate limits + the free-tier choices above; a per-day AI call cap like
  the OTP Layer-A pattern.
