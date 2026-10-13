# Tech Decision Record — Property Platform

**Status:** Baseline for Phase 0 + Phase 1 · Phase 1 slice implemented · **Date:** 2026-10-11 · **Owner:** [product owner]
**Source of truth:** the Developer Handover Pack v1.0 (§4 stack, §19 phases). This doc records where we **commit**, where we **diverge** from the pack, and what we **defer**. Read it before the handover pack, not instead of it.

> **Two deliberate divergences from spec §4:** (1) a single Next.js app instead of Next.js + a separate NestJS backend (§2); (2) **MongoDB Atlas** instead of PostgreSQL + PostGIS (§3). Both are MVP-scoped calls with documented trade-offs and migration paths.

---

## 1. Scope decision — build only Phase 0 + Phase 1 first

Build the marketplace vertical slice end-to-end before anything else. Everything gated, licensed, or legally risky is **explicitly out of scope now**: government land-record integrations, automated valuation, AI media, VR, and the full no-code workflow engine. Use mocks/adapters for every external service until accounts and terms are approved. Nothing in Phase 1 may depend on a government API.

**Build vs. buy:** the CRM alone is buyable (Zoho/HubSpot/Sell.Do). The public marketplace + land-intelligence modules are not available off-the-shelf for Bihar/North-India/Karnataka land records, so the platform is a **build**. Do not procure a separate CRM — the CRM arrives as a module in Phase 2.

---

## 2. Architecture decision — consolidate on Next.js for Phase 1 (diverges from §4)

The handover pack prescribes **Next.js + a separate NestJS backend**. For a Phase-1-only slice we **collapse this to a single Next.js app** (App Router + route handlers for the API). NestJS is added later *only* when scale or module complexity justifies a separate service.

| | Decision |
|---|---|
| **Why** | One deploy, one repo, one language, far less boilerplate for a small team shipping a vertical slice. The Phase-1 data is ordinary relational CRM/listing data — it does not need a standalone service yet. |
| **The cost** | We give up NestJS's module structure up front. We buy it back with discipline (see below). |
| **Migration path — required** | Keep **all business logic in framework-agnostic modules** under `src/server/modules/*` (Identity, Listings, Media, Documents, Review, Enquiries, Audit). Route handlers stay thin — they validate, authorize, and call a module. When a NestJS service is extracted later, the modules move across unchanged; only the transport layer changes. Do **not** put business logic in route handlers or React components. |

---

## 3. Stack — Phase 1

| Layer | Choice | Notes / gotchas |
|---|---|---|
| **Frontend + API** | Next.js 16 (App Router) + TypeScript + Tailwind v4 | UI, public marketplace, admin console, and `/api/v1/*` route handlers in one app. (shadcn/ui optional; current build uses Tailwind + a few custom component classes.) |
| **Business logic** | Plain TypeScript service modules (see §2) | Framework-agnostic so it survives a later NestJS split. |
| **Database** | **MongoDB Atlas** via Mongoose | ⚠️ **Diverges from spec §4** (PostgreSQL + PostGIS). Mongo covers Phase-1 geo with GeoJSON + `2dsphere` indexes (map-pin radius/bounds search). Trade-off lands later: relational-heavy modules (audit, research evidence, legal review, record-level RBAC joins) are more work to keep consistent in a document store. Accepted for the MVP; keep all queries behind the module service layer so a store swap stays contained. |
| **ODM** | **Mongoose** | Schemas, validation, geo indexes, plus the HMR-safe cached-connection + model-guard pattern (see `src/server/db/connect.ts`). |
| **Auth + RBAC** | Email + password; signed-JWT session cookie (`jose`) + `bcryptjs` | **Implemented.** Self-signup creates OWNER; admins are seeded/promoted; `src/middleware.ts` gates pages and every API route re-checks server-side (never trusts the client); record-level ownership (`createdById`) isolates each owner's listings (guards IDOR/BOLA). **Hardening path before launch:** Auth.js/OIDC, **phone-OTP**, **MFA for admin/legal/super-admin**, password reset, account lockout. |
| **Listing media** | **Cloudinary** (signed direct upload) | **Implemented.** Server signs `{folder,timestamp}` with the API secret; browser uploads image/video straight to Cloudinary; we store the `secure_url` + `public_id`. Public-CDN URLs — fine for listing photos/video. |
| **Private documents** | S3-compatible (Cloudflare R2 / AWS S3), **private buckets + signed URLs** | ⚠️ Separate from listing media. Legal/identity docs must stay **private** (short-lived signed access, MIME/size allowlists, malware scan) — Cloudinary's public URLs are **not** suitable. Deferred to the document/verification phase. |
| **Maps** | MapLibre GL JS + a licensed tile/geocoding provider | 💰 **Budget line — not free.** Do not build production autocomplete on public Nominatim; do not scrape Google. Keep the provider behind a `MapProvider` adapter. |
| **Background jobs** | **Deferred to Phase 2** | Phase 1 has no durable workers. The one exception is async CSV import + media derivatives — if needed in Phase 1, use a lightweight queued job; otherwise push to Phase 2 with BullMQ/Redis. |

---

## 4. Hosting — the consolidation pays off for Phase 1

Because Phase 1 is Next.js-only with **no long-running workers**, it is **deployable on Vercel + MongoDB Atlas**. This resolves the hosting caution in the brief for now.

**Trigger to move to container hosting** (Render / Railway / Fly.io / AWS ECS+RDS): the arrival of durable background work — Phase 2 (bulk import, messaging webhooks) and Phase 3 (OCR, image processing, malware scanning). Plan for that migration; don't pre-build it. The one thing that could pull it forward is heavy **media derivative generation or document malware scanning** in Phase 1 — if that lands in scope, use a managed service for it rather than standing up containers early.

---

## 5. Non-negotiable product & security rules (carry into every phase)

- **No single "Verified" badge.** Expose exactly *what* was checked, *by whom*, *from which source*, *when*. Keep publication status separate from document/record/field/legal-review status. (§1, §7 of the pack.)
- **Least privilege, server-side authz, immutable audit** on every status change, access grant, data export, and sensitive-document access.
- **Never leak** deeds, identity docs, private phone/email, or internal notes in public API responses.
- Money as integers — never float (the build stores whole-INR integers; use paise if sub-rupee precision is ever needed). Dimensions stored with unit **plus** normalized conversion; katha/bigha are left unconverted until per-district factors are configured (they vary by district).
- Stable ids (Mongo ObjectIds), UTC timestamps, soft-delete where justified, and versioned migration scripts for schema/shape changes.

---

## 6. India compliance gates (start now — they block go-live, not code)

These have lead times measured in weeks. Begin in parallel with Phase 1 build:

- **SMS/OTP → DLT registration** (sender IDs + templates) with an Indian provider (MSG91/Kaleyra/Twilio). Required before OTP works in production.
- **WhatsApp → Meta template approval** via an approved BSP (AiSensy/Interakt/WATI/Gupshup). Phase 2, but setup starts early.
- **DPDP Act** — design consent capture (version + timestamp), opt-out/suppression, and deletion handling from day one; counsel review before launch.
- **Email** — SPF/DKIM/DMARC on the sending domain.

---

## 7. Phase 1 build order (vertical slice)

1. Auth + roles (OTP, server-side RBAC, MFA for admin).
2. Listing draft: create/edit, state-aware fields, map pin + pin-precision, price/area with units.
3. Media upload via signed URLs; optional private legal-docs/identifiers form (skippable).
4. Moderation queue: request correction / approve / reject / publish, with reasons + immutable status history.
5. Public search/detail: published-only fields, filter by location/type/price/area, map↔list sync.
6. Enquiry capture → Lead with consent + source attribution, rate-limited, dedupe, audit.
7. Role-negative tests: prove one owner/CP cannot reach another's private listing/docs/leads by guessing IDs.

**Phase 1 is done when** all of the above pass, plus: OpenAPI spec, migrations, seeded demo data per role, CI, and backup/restore instructions are delivered.

---

## 8. Open decisions to close at kickoff (block or shape code)

| Decision | Why it matters to the build |
|---|---|
| **Atlas tier, region & backups** | Cluster size, an **India region** for data residency (DPDP), and backup/PITR policy. Set before real data lands. |
| **Auth.js + OTP provider wiring** | Replaces the stubbed dev-header identity. Affects RBAC + MFA implementation and session model. |
| **Maps/geocoding vendor + monthly budget** | A paid dependency; sets cost alerts and the `MapProvider` adapter shape. |
| **Launch districts (Bihar + Karnataka) + property categories** | Drives state-aware fields, unit conversions, and identifier types. |
| **Does public listing mask owner phone?** | Changes the public listing API contract and lead-capture flow. |
| **Account ownership** | Domain, MongoDB Atlas, maps, SMS/WhatsApp, Git org must be **business-owned**, not developer-personal. Scoped access to devs; rotate on handover. |

---

*This is a decision record, not the full spec. Enum values, validation, precision, and error shapes live in the OpenAPI 3.1 spec the developer produces in Phase 0.*
