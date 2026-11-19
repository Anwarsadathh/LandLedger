# OROVA — Project Handoff / Continue-on-another-laptop guide

_Last updated: 2026-11-19_

This is a practical "pick up where I left off" guide. Read top to bottom the first time
on a new machine, then use it as a checklist.

---

## 1. What OROVA is

OROVA is a **transparent land & property marketplace for India**. The pitch: every listing
is human-reviewed, nothing is faked (no misleading "Verified" badges), and listing is free.
It covers land/plots, homes, commercial, agricultural and industrial property, with
Indian-specific area units (bigha, katha, cent, decimal, acre) and state/district/locality
addressing.

- **Repo:** https://github.com/Anwarsadathh/LandLedger
- **Production:** https://orova-pi.vercel.app (Vercel deploys the `main` branch)
- **Local path (old laptop):** `d:\property-platform`

---

## 2. Tech stack

| Area | Choice |
|------|--------|
| Framework | **Next.js 16.4.0** (App Router, Turbopack) — ⚠️ breaking changes vs older Next, see `AGENTS.md` |
| UI | **React 19.3**, TypeScript, **Tailwind CSS v4** (CSS tokens in `src/app/globals.css` `:root`) |
| DB | **MongoDB Atlas** via Mongoose; GeoJSON Point (2dsphere) + optional Polygon boundary |
| Maps | **Leaflet** + OSM tiles, Esri World Imagery (satellite), leaflet.markercluster |
| Auth | Google OAuth + custom JWT session cookies; Firebase Phone / Twilio / SmsLocal OTP (mobile) |
| AI | **Anthropic Claude SDK** (`@anthropic-ai/sdk`), model `claude-sonnet-5-5`, manual tool-use loop |
| Images | Cloudinary (uploads) + Unsplash URLs for demo/category imagery |
| i18n | Cookie-based locale (`orova_lang`), **English + Hindi only** |
| Node | v22.15.1 (use Node 20+); Git user: `Anwarsadathh` |

---

## 3. Setup on a new laptop

```bash
# 1. Clone
git clone https://github.com/Anwarsadathh/LandLedger.git property-platform
cd property-platform

# 2. Install
npm install

# 3. Create .env.local  (SEE SECTION 4 — this is NOT in git)
#    Copy it over securely from the old laptop (USB / password manager / secure note).
#    Do NOT email it or commit it.

# 4. (Firebase) copy firebase-service-account.json to the repo root too (also gitignored).

# 5. Run
npm run dev          # http://localhost:3000
```

Other commands:

```bash
npm run build        # production build
npm run lint         # eslint
npm run seed         # tsx scripts/seed.ts — seeds demo listings into MongoDB
```

**Quality gates I run before every commit (do the same):**

```bash
NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit    # typecheck (must be clean)
npx eslint src/...                                          # lint (ignore canonicalClasses warnings)
```

> **Turbopack gotcha:** when you add a *new* route folder under `src/app/`, `next dev` often
> 404s it until you restart the dev server. Production builds are fine. If a page 404s locally
> but you're sure it exists, stop dev, delete `.next/`, and `npm run dev` again.

---

## 4. Environment variables (`.env.local`)

`.env.local` is **gitignored** and holds live secrets — it is NOT in the repo. Copy it from the
old laptop. Below are the variable **names** and what each does (no values here on purpose).

**Required to boot:**
- `MONGODB_URI` — MongoDB Atlas connection string (percent-encode special chars in the password)
- `MONGODB_DB` — database name (`property_platform`)
- `AUTH_SECRET` — signs session JWTs. Rotating it logs everyone out.

**Image uploads (Cloudinary):**
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

**Google sign-in:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Mobile OTP** (optional — dev fallback prints the code to the terminal if unset):
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `TWILIO_VERIFY_CHANNEL`, `TWILIO_WHATSAPP_FROM`, `TWILIO_SMS_FROM`
- SmsLocal (India, preferred when set): `SMSLOCAL_API_KEY`, `SMSLOCAL_ROUTE`, `SMSLOCAL_SENDER`, `SMSLOCAL_TEMPLATE_ID`
- Caps: `OTP_DAILY_CAP`, `OTP_MONTHLY_CAP` (0 = no cap)

**Firebase (phone auth):**
- Public client config: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT_PATH` — path to the service-account JSON (private, also gitignored)

**AI assistant (Ask OROVA):**
- `ANTHROPIC_API_KEY` — **currently blank**; the chat assistant + chat-to-list only work once this is set.
- `AI_DAILY_CAP` — optional token/message cap per day (commented out).

> On **Vercel**, the same env vars must be set in Project → Settings → Environment Variables.
> `ANTHROPIC_API_KEY` and `AI_DAILY_CAP` are **not yet set in production** — the Ask OROVA chat
> is dormant in prod until they are.

---

## 5. Git workflow

- Work branch: **`feat/discovery-map-ai-assistant`** (currently identical to `main`).
- Deploy = merge to **`main`** (Vercel auto-deploys `main` to production).
- The pattern I've been using:
  ```bash
  git add -A && git commit -m "..."                 # on the feature branch
  git checkout main && git merge --ff-only <branch> # fast-forward main
  git push origin main                              # triggers Vercel prod deploy
  git checkout <branch> && git push origin <branch>
  ```
- No `gh` CLI installed on the old laptop (so PRs were done by merge, not `gh pr`).
- `AGENTS.md` block in the repo is auto-written by `next dev` — committing it with your work
  keeps the tree clean; deleting it just re-creates the uncommitted change.

---

## 6. What's DONE ✅

**Core marketplace**
- Listing model, search/filter, detail pages, enquiry flow (contact gated behind enquiry).
- Listing wizard (`/listings/new`) with map pin + "draw plot outline" polygon mode.
- Map explorer (`/map`): clustered markers, satellite/map toggle, mobile-collapsible filters,
  2-cards-per-row compact grid.

**Phase 4 — detail upgrades:** satellite map, enquiry-gated Call/WhatsApp/Share, owner rating,
map boundary polygons (owner-draw + render).

**Phase 5 — price insights:** indicative price range bar + monthly median ₹/sqft trend chart.

**Phase 6 — AI "Ask OROVA" assistant:** floating widget site-wide; Claude-powered; grounded only
in real listings via tools (`search_listings`, `get_listing_details`); **chat-to-list** for
signed-in owners (`draft_listing` → creates a DRAFT that still goes to human review).
Latest work: intake prompt rewritten to ask one question at a time; widget is sign-in aware —
guests get a clickable **"Sign in to continue"** button + a "List my property (free)" starter.

**i18n:** site-wide English + Hindi switcher (cookie `orova_lang`), English fallback catalog.

**Admin panel:** standalone shell (no public header/footer), sidebar nav, dashboard with KPIs +
listings-by-status + recent enquiries, Listings / Review queue / Enquiries / Users pages.
Enquiry CRM foundation (`enquiryStats`, `listEnquiriesForAdmin`, `updateEnquiryStatus`).

**Home + brand:** indigo/blue theme, image-forward rotating hero (all property types),
location-aware feed (shows listings near the visitor first), distinctive CTA with map motif,
fixed category tile images.

**Infra fixes:** replaced down `picsum.photos` images with Unsplash (ran `scripts/fix-listing-images.ts`);
hid "Continue with mobile number" sign-in in production.

---

## 7. What's PENDING / TODO ⬜

**Pre-launch (do first):**
- [ ] **Rotate the Cloudinary API secret** — it was committed to the public repo earlier, so
      treat it as compromised. Regenerate in the Cloudinary console and update `.env.local` + Vercel.
- [ ] Add **`ANTHROPIC_API_KEY`** in Vercel env vars (+ optional `AI_DAILY_CAP`) to switch on
      the Ask OROVA chat + chat-to-list in production.
- [ ] Re-enable an OTP daily/monthly cap in production (`OTP_DAILY_CAP` is currently 0 = unlimited).
- [ ] Confirm all `.env.local` secrets are mirrored into Vercel's env vars.

**Feature backlog:**
- [ ] **CRM build-out** — assign leads, notes/activity timeline, CSV export, more enquiry filters
      (the admin enquiries page is only the foundation).
- [ ] Mobile OTP (Firebase Phone) needs Blaze billing wired up for production — not done.
- [ ] Finish i18n coverage on admin / dashboard / auth pages; get a native-speaker Hindi review.
- [ ] Price-trend "cached aggregates" background job (trend is computed live right now).

---

## 8. Known issues & gotchas

- **New route folders 404 locally** until `next dev` restart (Turbopack) — see Section 3.
- **`ANTHROPIC_API_KEY` blank** → Ask OROVA replies "unavailable". The client-side sign-in prompt
  for listing still works without it; the guided questions + draft creation need the key.
- **picsum.photos is down** — do not use it for images. Use `images.unsplash.com/photo-<id>?auto=format&fit=crop&w=<w>&q=<q>` (verified reliable).
- React 19 compiler lint: **no synchronous `setState` inside an effect** — await something first,
  or move the trigger to an event handler.
- Leaflet maps need `isolate` on their container so they don't paint over the sticky header.
- `next dev` shows a Next.js security-upgrade nudge that can exit once with code 1 — just retry.

---

## 9. Key files map

| Path | What |
|------|------|
| `src/app/page.tsx` | Home: hero, category tiles, location-aware feed, CTA |
| `src/components/HeroBackground.tsx` | Crossfading hero background images |
| `src/components/AppChrome.tsx` | Site shell (header/footer/widget); bare for `/signin`,`/signup`,`/admin/*` |
| `src/components/AssistantWidget.tsx` | Ask OROVA floating chat UI (sign-in aware) |
| `src/server/ai/assistant.ts` | Claude assistant: tools, intake prompt, `draft_listing` |
| `src/app/api/v1/assistant/chat/route.ts` | Chat API (resolves current user, calls `runAssistant`) |
| `src/components/MapExplorer.tsx` / `ListingLocationMap.tsx` / `LocationPicker.tsx` | Maps |
| `src/components/PriceInsights.tsx` + `src/server/modules/insights/service.ts` | Price range + trend |
| `src/app/admin/` | Standalone admin shell + dashboard/listings/review/enquiries/users |
| `src/server/modules/enquiries/admin.ts` | Enquiry CRM foundation |
| `src/lib/i18n/` | `config.ts` (locales), `messages.ts` (en+hi catalog) |
| `src/app/globals.css` | Theme tokens (indigo/blue) + AI animations (`ai-halo`/`ai-pulse`/`ai-twinkle`) |
| `scripts/seed.ts` / `scripts/fix-listing-images.ts` | Seed demo data / repair listing images |
| `docs/` | PRD.md, tech-decisions.md, discovery-map-ai-plan.md, handover-spec.md, real-estate-crm-brief.md |

---

## 10. First 10 minutes on the new laptop

1. `git clone` + `npm install`
2. Copy `.env.local` and `firebase-service-account.json` over securely
3. `npm run dev` → open http://localhost:3000, check the home page renders
4. Run the gates (`tsc --noEmit`, `eslint`) to confirm a clean baseline
5. Check you're on `feat/discovery-map-ai-assistant` and it matches `origin/main`
6. Then tackle the pre-launch TODOs in Section 7 (Cloudinary rotation + Vercel env vars first)
