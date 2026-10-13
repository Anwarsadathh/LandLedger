# Property Platform (working name)

Property marketplace & land-intelligence platform — **Phase 1 MVP**.
Focus geographies: Bihar, northern India, Karnataka.

Built as a **single Next.js app** (UI + API in one service). Business logic lives
in framework-agnostic modules under `src/server/modules/*` so a separate NestJS
service can be extracted later without a rewrite. See
[docs/tech-decisions.md](docs/tech-decisions.md) for the rationale.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + custom component classes
- **Database:** MongoDB Atlas via **Mongoose** (GeoJSON + `2dsphere` for map-pin search)
- **Validation:** Zod
- **Media:** Cloudinary (signed direct image/video upload; the secure URL is stored in Mongo)
- **Auth:** email + password, signed-JWT session cookie (`jose`) + `bcryptjs`; role-based access with per-user data isolation. Phone-OTP + MFA deferred.

## Quickstart

```bash
# 1. Install
npm install

# 2. Configure env
#    Copy .env.example to .env.local; set MONGODB_URI and AUTH_SECRET
cp .env.example .env.local      # then edit MONGODB_URI + AUTH_SECRET
#    Generate a secret: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# 3. Seed demo data + accounts (prints demo logins at the end)
npm run seed

# 4. Run
npm run dev                     # http://localhost:3000
```

> No `MONGODB_URI` yet? The app still boots — the marketplace shows a
> "set MONGODB_URI" message and `GET /api/v1/ready` returns `NOT_READY`.

## What works (Phase 1 vertical slice)

End-to-end: **create listing → submit → moderate → publish → public search → enquiry.**

- Owner/broker creates a draft listing (state-aware fields, price/area with local
  units, lat/lng pin) and submits it for review — `/listings/new`.
- Admin/reviewer works a moderation queue: **Approve → Publish** (two-step gate),
  **Request correction**, or **Reject** (reason required) — `/admin/review`.
- Public marketplace lists **published** listings with filters (state, type,
  price, text) and a geo-ready search API — `/`.
- Public listing detail page with an enquiry form that captures consent + source
  and creates a lead (with phone+listing de-duplication) — `/listings/[slug]`.
- Every status change and enquiry writes an immutable **audit** event.

### Accounts & roles

Real auth (email + password). **Self-signup at `/signup` always creates an
OWNER**; owners see only their **own** listings on `/dashboard` (record-level
isolation). **Admins are seeded/promoted** (public signup can't create one) and
get a role-gated `/admin/review` area — the nav "Admin" link and the route are
hidden/blocked for non-admins by `src/middleware.ts`.

Seeded demo logins (printed by `npm run seed`):

| Role | Email | Password |
|---|---|---|
| Owner | `owner@demo.local` | `owner12345` |
| Admin | `admin@demo.local` | `admin12345` |

Still to harden before production: phone-OTP, **MFA for admin/legal roles**,
password reset, and account lockout. Interim notes in
[docs/tech-decisions.md](docs/tech-decisions.md).

## Project structure

```
src/
  middleware.ts         # route protection (gates /dashboard, /listings/new, /admin)
  app/
    api/v1/...          # route handlers (auth, health, listings, public, admin, enquiries)
    page.tsx            # marketplace home (public)
    signin / signup     # auth pages
    dashboard           # owner's own listings (per-user isolation)
    listings/new        # create + submit a listing (auth required)
    listings/[slug]     # public detail + enquiry form
    admin/review        # moderation queue (admin/reviewer only)
  components/           # ListingCard, EnquiryForm, AuthForm, SignOutButton, SubmitListingButton
  lib/                  # http envelope, rate-limit, slug, format, consent
  server/
    db/                 # Mongoose connection + models (listing, enquiry, user, audit)
    domain/enums.ts     # shared enums (framework-agnostic)
    auth/               # roles, password (bcrypt), session (jose), current-user
    modules/            # auth, listings, enquiries, audit  (business logic — thin routes call these)
scripts/seed.ts         # demo data + accounts
docs/tech-decisions.md  # architecture decision record
```

## API (baseline — see spec §10)

| Method & path | Purpose |
|---|---|
| `GET /api/v1/health` · `GET /api/v1/ready` | Liveness / readiness |
| `POST /api/v1/auth/register` · `login` · `logout` · `GET me` | Auth + session cookie |
| `POST /api/v1/listings` | Create draft (owner/broker) |
| `POST /api/v1/listings/{id}/submit` | Submit for review |
| `GET /api/v1/public/listings` | Public search (published only; `?state`, `?type`, `?priceMin/Max`, `?q`, `?lat&lng&radiusKm`) |
| `GET /api/v1/public/listings/{slug}` | Public detail |
| `POST /api/v1/listings/{id}/enquiries` | Create enquiry (public, rate-limited, consent required) |
| `GET /api/v1/admin/review-queue` | Moderation queue (reviewer/admin) |
| `POST /api/v1/admin/listings/{id}/decision` | Approve / Publish / Request correction / Reject |

All responses use a standard envelope: `{ data, requestId }` or
`{ error: { code, message, requestId, details? } }`.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run seed` | Insert demo data (idempotent) |
| `npm run lint` | ESLint |

## Deferred (not in Phase 1)

Durable background jobs (BullMQ/Redis), **media malware-scan + derivatives**,
**private** document storage (legal/identity docs — Cloudinary is public-CDN, so
it's for listing media only), document/legal review, research & land-record
workspace, land intelligence / valuation, AI media, VR, **phone-OTP + MFA +
password reset**, and a full MapLibre map UI (coordinates are entered manually
for now). Scope and rationale: [docs/tech-decisions.md](docs/tech-decisions.md).

## Secrets

Copy `.env.example` to `.env.local` and fill in your Atlas values. The real
`.env.local` must never be shared or committed (it is git-ignored).
