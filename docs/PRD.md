# OROVA — Product Requirements Document (PRD)

> **Brand note:** the product was renamed **LandLedger → OROVA** (oro = "gold", evoking a premium,
> trustworthy property brand) on 2026-10-17. Older commits and some source specs may still say
> "LandLedger"; they refer to the same product.

**Status:** Living document · **Last updated:** 2026-10-17 · **Owner:** [product owner]
**Companion docs:** [tech-decisions.md](tech-decisions.md) (architecture) · [DEPLOY.md](../DEPLOY.md) (deployment) · [README.md](../README.md) (run/dev)
**Source specs:** [handover-spec.md](handover-spec.md) (the full Property Marketplace & Land Intelligence baseline) · [real-estate-crm-brief.md](real-estate-crm-brief.md) (the Real Estate CRM brief)

> This PRD describes **what** the product is and **why**, and tracks what is **built** vs **planned**.
> Architecture (**how**) lives in `tech-decisions.md`. Where they overlap, this doc defers to that one.

---

## 1. Summary

**OROVA** is a transparent online marketplace for **land, plots, and property across India** —
starting with land/plots and residential/commercial listings. Owners and brokers list properties;
every listing is **human-reviewed** before it goes public; buyers search, filter by state/city, and
enquire directly.

**The core differentiator:** honesty about *what was actually checked*. We never show a single
misleading green **"Verified"** badge. A listing's status says exactly what was reviewed (listing
content, documents, a field visit, a legal opinion), by whom, and when — and nothing more.

---

## 2. Problem & opportunity

- Indian land/property listings are full of **stale, duplicate, and misrepresented** entries, and
  fake "verified" claims that buyers can't trust.
- **Land** specifically is underserved by mainstream portals (which focus on flats/apartments) and
  needs **state-aware** handling: local units (bigha, katha, decimal, acre), district/circle/mouza
  terminology, and state-specific identifiers.
- Opportunity: a marketplace that is **honest by design** (clear review status), **land-first**, and
  **low-friction to list** (including future AI/WhatsApp intake for brokers).

---

## 3. Users & roles

| Role | Can do | Must not access |
|---|---|---|
| **Public visitor** | Search, view published listings, submit an enquiry | Private owner contact, documents, internal notes |
| **Owner / Broker** | Register, create & manage **their own** listings, see their statuses | Other owners' listings, leads, documents |
| **Listing reviewer / Admin** | Moderate (approve → publish, request fix, reject), pause, edit, delete; see the review queue + stats | Bypass of audit; (legal vault — future, separately permitted) |
| **Super-admin** | Everything + role management (MFA required — planned) | — |

Record-level ownership is enforced server-side: an owner only ever sees/edits **their own** listings.
Roles planned for later phases: inside sales, research analyst, legal reviewer, field executive,
channel partner (per `tech-decisions.md` and the original handover spec).

---

## 4. Scope

### 4.1 Built & live (Phase 1 — current)
- Email + password **auth** with per-user isolation; **admin** role gated.
- Multi-step **listing wizard** (99acres-style) with state-aware fields and local units.
- **Moderation workflow** + a full **admin dashboard** (moderate / pause / edit / delete, stats, tabs).
- **Media uploads** to Cloudinary (images + video, signed upload).
- **Public marketplace** with searchable **state + city** filters (all-India dataset).
- **Enquiry capture** → lead, with consent + source + dedupe.
- **Location picker**: paste a Google Maps link, use current location, or enter manually; pin
  **reverse-geocodes** to auto-fill state/city.
- Deployed on **Vercel + MongoDB Atlas**; media on **Cloudinary**.

### 4.2 Planned (roadmap) — see §9
Phone / **WhatsApp OTP sign-in**, **AI intake** (broker messages → draft listing), interactive
**MapLibre** pins, document/legal review workspace, research & land-record evidence, land-intelligence
(circle rates, comparables), channel-partner distribution, VR tours.

### 4.3 Out of scope (for now)
Automated valuation as fact, AI-generated media passed as real, any "guarantee" of title or clear
ownership, and any government-record integration that lacks an authorised API.

---

## 5. Functional requirements

### 5.1 Accounts & auth (built)
- Email + password sign-up/sign-in; sessions via signed-JWT httpOnly cookie.
- Public sign-up creates an **OWNER**; admins are seeded/promoted.
- Server-side authorization on every request; middleware gates `/dashboard`, `/listings/new`, `/admin`.
- **Planned:** phone / WhatsApp **OTP** login (passwordless), MFA for privileged roles, password reset.

### 5.2 Create a listing — the wizard (built)
Five steps, mobile-optimised, with per-step validation and a completeness meter:
1. **Basics** — Sell/Lease, category (Residential / Commercial / Land & Agricultural), subtype.
2. **Location** — pin first (Maps link / current location) → auto-filled State & City; district/circle/
   locality; map preview.
3. **Profile** — title, price (whole-₹ integers), area + **local unit**, features (facing, road access…).
4. **Photos & video** — Cloudinary upload with progress animation.
5. **Contact & confirm** — owner contact (kept private), submitter role, **authority declaration** +
   **contact consent** (both explicit, required).
- On submit → created as a **DRAFT** and sent for review; the owner tracks it on their dashboard.

### 5.3 Moderation & admin (built)
- Workflow states: `DRAFT → SUBMITTED → NEEDS_CORRECTION → APPROVED_TO_PUBLISH → PUBLISHED`, plus
  `PAUSED`, `REJECTED`, `WITHDRAWN`.
- **Approve → Publish** is a deliberate two-step gate. Reject / Request-fix require a reason.
- Admin dashboard: **stat tiles**, **status tabs** with counts, per-listing **moderate / pause /
  unpause / edit / delete**, and an expandable detail view (media gallery, attributes, review history).
- Every status change, edit, delete and enquiry writes an **immutable audit event**.

### 5.4 Public marketplace & search (built)
- Lists **published** listings only; cards show price, area (with normalized sq-ft), location, subtype.
- Filters: **searchable state + city** (all-India), type, price range, text. Searching switches the
  home page into a focused results view at the same URL.
- Listing detail page with media, attributes, a map reference, and an **enquiry form**.

### 5.5 Enquiries → leads (built)
- Public enquiry → **lead** with consent (versioned), source attribution, and phone+listing **dedupe**;
  rate-limited; audited. Owner contact is never exposed publicly.
- **Planned:** full CRM pipeline (stages, assignment, tasks, site visits) per the handover spec Phase 2.

### 5.6 AI / WhatsApp intake (planned)
- A broker messages (WhatsApp or an on-site chatbot) → an AI engine extracts listing fields into the
  existing schema, asks only for what's missing, and creates a **DRAFT** (human still approves).
- Build order: on-site chat widget first (Claude API only), then WhatsApp via a BSP. Details in chat/
  design notes; nothing auto-publishes.

---

## 6. Non-functional requirements

- **Trust/product rule:** never present a listing as legally clear. Expose what was checked, by whom,
  from which source, and when. No single "Verified" badge.
- **Security:** HTTPS, httpOnly session cookies, server-side RBAC + record-level ownership (guards
  IDOR/BOLA), hashed passwords (bcrypt), input validation (Zod), private owner data never in public
  responses, rate limits on auth/enquiry/upload. Secrets only in host env (Vercel), never in the repo.
- **Privacy (India DPDP):** consent capture with version + timestamp; opt-out/retention handling;
  owner contact + documents private by default; counsel review before scaling.
- **Data integrity:** money as integer rupees (never float); dimensions stored with unit **plus**
  normalized conversion (katha/bigha left unconverted until per-district factors are configured);
  UTC timestamps; audit trail.
- **Performance:** responsive lists/detail on realistic volumes; media offloaded to Cloudinary CDN;
  geo queries via MongoDB `2dsphere`.
- **Accessibility/UX:** mobile-first, forced light theme, reduced-motion aware.

---

## 7. Data model (core entities)

- **User** — name, email, phone, passwordHash (private), role, status.
- **PropertyListing** — type/subtype, transaction, title, description, price, area (+normalized),
  location (state/district/locality + GeoJSON point + pin precision), features, landIdentifiers,
  media[], private ownerContact, declarations/consent, workflowStatus, reviewHistory[], publicSlug.
- **Enquiry (lead)** — listing, contact, consent, source/UTM, status, dedupeKey.
- **AuditEvent** — actor, action, entity, metadata, timestamp (append-only).
- **Planned:** OtpChallenge (OTP login), IntakeConversation (AI), ReviewCase/EvidenceRecord,
  RateObservation/Comparable (land intelligence).

Full field definitions live in code (`src/server/db/models/*`, `src/server/modules/listings/schema.ts`).

---

## 8. Tech stack (summary)

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · **MongoDB Atlas** (Mongoose) ·
**Cloudinary** (media) · Zod validation · JWT sessions (`jose`) + bcrypt · OpenStreetMap Nominatim
(reverse geocoding) · Vercel hosting. Rationale and divergences from the original spec: see
[tech-decisions.md](tech-decisions.md).

---

## 9. Roadmap

| Phase | Scope | Status |
|---|---|---|
| **1 — Marketplace MVP** | Auth, listing wizard, moderation/admin, media, public search, enquiries, location picker | ✅ Built |
| **2 — Auth & CRM** | WhatsApp/phone **OTP login**, MFA, password reset; lead pipeline, assignment, tasks, site visits | ◻ Next |
| **3 — AI intake** | On-site chatbot → draft listing (Claude API); then WhatsApp intake via BSP | ◻ Planned |
| **4 — Maps & verification** | Interactive MapLibre pins; document/legal review workspace, evidence register, field visits | ◻ Planned |
| **5 — Land intelligence** | Circle/guideline rates, comparables, transparent estimate reports (labelled indicative) | ◻ Planned |
| **6 — Distribution & VR** | Channel-partner sharing; WebXR/360° tours | ◻ Later |

---

## 10. Success metrics (initial KPIs)

- Submitted → published conversion; median time to first review.
- % of listings with a valid map pin; duplicate/spam rate.
- Enquiry response time; contact rate; qualified-lead rate; site visits booked.
- Document/record review turnaround (Phase 4); source coverage & freshness (Phase 5).

---

## 11. Open decisions

- Launch districts & priority states; which property categories at launch.
- Pricing model (free listings, paid promotion, lead fees, brokerage).
- Whether public listings mask owner phone (currently private by default — confirm).
- WhatsApp BSP choice + Meta business verification; Atlas tier/region/backup policy.
- Data retention & deletion schedule; counsel review of privacy/terms and the listing declaration.
- Brand/domain finalisation (current brand: **OROVA**; secure matching domain + trademark).

---

## 12. Changelog — recent updates

### 2026-10-17 — Rebrand to OROVA + full UI redesign + legal pages

**Brand**
- Renamed **LandLedger → OROVA** across the app (nav, metadata, auth, footer, API user-agents).
- New **animated SVG wordmark** (`public/orova-logo.svg` for light surfaces, `orova-logo-light.svg`
  for dark surfaces) — a house mark + "OROVA", with a draw-on animation and a reduced-motion fallback.

**Design system** (`src/app/globals.css`)
- Warm, editorial, forced-light palette: cream background `#f7f4ef`, charcoal `#1b1813`, amber/gold
  accent `#e0813f` (+ soft tint), consumed via CSS tokens and Tailwind v4 `@theme inline`.
- Pill-style primitives (`.btn-primary/.btn-ghost/.btn-accent/.chip/.card/.input`), scroll-reveal,
  entrance/float/shimmer keyframes, horizontal-scroll `.no-scrollbar` utility.

**Landing page** (`src/app/page.tsx`)
- Premium photo hero (curated architecture image + soft black wash) with a **compact search bar**
  (slim one-row on desktop; single pill + sliders icon on mobile).
- Card-forward sections: **category chips**, **quick tiles**, a **"Popular right now"** horizontal
  snap row of image-overlay cards, a **"Recently listed"** grid, and **"More across India"** list rows.
- CTA band now sits flush to the footer (removed stacked empty spacing).

**Listing detail** (`src/app/listings/[slug]/page.tsx`, `src/components/ListingGallery.tsx`)
- Image-forward hero with price/location overlay + save-heart, thumbnail strip with **+N**, full
  **lightbox** (keyboard nav), highlights grid, description, embedded **map**, and a mobile
  **sticky action bar**. Seller card is an **honest review card** (human-reviewed + published date) —
  never a fake "Verified owner" badge.

**Auth** (`src/components/AuthForm.tsx`, `src/components/AppChrome.tsx`)
- Split-screen sign-in/up: photo panel ("Discover Your Dream Home") + form with pill tabs and social
  buttons. Social sign-in is **UI-only / "coming soon"** (email+password is the working path).
- Auth routes render **full-bleed with no site header/footer** at all screen sizes (via `AppChrome`).

**Navigation**
- Added category links (Land & Plots · Homes · Commercial) and a prominent **"List property — FREE"**
  action (desktop + mobile), with the warm active-pill styling and a responsive logo.

**Components reworked to the warm theme**: `ListingCard` (image-forward with type/transaction pills),
`MarketplaceFilters` (adds a `compact` hero variant), `Combobox`, `SiteNav`, the listing wizard chip,
and admin interactive states (semantic status badges kept).

**Legal** — added **Privacy Policy** (`/privacy`) and **Terms & Conditions** (`/terms`) pages +
footer links; removed the "Working MVP" tag. Pages are DPDP-aware working drafts (contact emails are
placeholders) and **still require review by counsel** before launch (see §6, §11).

> Correctness gates for this work: `tsc --noEmit` and `eslint` both clean. Local Turbopack builds are
> flaky on this Windows machine (an environmental CSS-worker spawn error); Vercel builds are unaffected.

---

*This PRD is a baseline, not a contract. Provider API capability, government-record access, messaging
permissions and local regulatory requirements are implementation-validation items.*
