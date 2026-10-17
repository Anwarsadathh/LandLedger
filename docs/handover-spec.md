# Property Marketplace & Land Intelligence Platform — Developer Handover Pack

**Version 1.0 | 10 October 2026 | Confidential – Working Specification**

> Source specification this project is built against. This is the original baseline;
> where the actual build diverges, see [tech-decisions.md](tech-decisions.md) and [PRD.md](PRD.md).
> **Purpose:** give the development team a single baseline for product scope, architecture,
> API design, integrations, security, phased delivery and acceptance.

---

## 1. Purpose and build mandate

This document is the implementation baseline for a multi-sided property platform covering
property/land listings, owners and brokers, listing review, optional legal-document submission,
land-record research, AI-assisted media processing, lead CRM, channel-partner distribution, and
future VR-assisted selling.

The initial operating focus is land/property listings in Bihar, other northern Indian states, and
Karnataka. The system must be **state-aware**: land identifiers, records, terminology, government
portals, and workflows differ by state and district.

Build a modular web platform with documented APIs and clear phase boundaries. **Do not make Phase 1
dependent on** government integrations, automated valuation, AI image generation, or VR.

> **Product rule:** never present a listing as legally clear merely because an owner uploaded
> documents or a reviewer checked public records. Expose exactly **what** was checked, **by whom**,
> **from which source**, and **when**.

---

## 2. Product goals and success measures

- Allow an owner/broker to submit a listing with map pin, location, asking price/range, land/property
  dimensions, media, and contact/authority details.
- Allow optional upload of legal/title/land-record documents and optional state-specific identifiers
  such as plot/survey number, khata/khesra, khatauni/jamabandi, mouza/village,
  circle/anchal/tehsil/taluk, district and state.
- Give admins a queue to request corrections, approve/reject publication, review documents
  separately, assign research, and record field visits.
- Publish approved listing pages with search/filter/map and enquiry capture.
- Capture every enquiry in CRM, assign an owner, track contact attempts, qualification, site visits,
  outcomes and source attribution.
- Provide permissioned channel-partner distribution without leaking private owner data or
  unrestricted lead records.
- Create an evidence register for government/public record checks, circle rates, comparable
  transactions/asking prices, imagery references and research notes.
- Keep future integrations replaceable through adapters and feature flags.

**Suggested initial KPIs:** submitted-to-published conversion; median time to first review; percentage
of listings with valid map pins; enquiry response time; contact rate; qualified-lead rate; site
visits booked; duplicate/spam rate; document review turnaround; source coverage and freshness for
research records.

---

## 3. User roles and permission model

| Role | Core permissions | Must not access by default |
|---|---|---|
| **Public visitor** | Search, view public listing fields, submit enquiry | Private documents, owner private phone/email, internal notes, CRM |
| **Owner / seller** | Create/edit own drafts; upload media/documents; view own listing status and enquiries explicitly shared | Other owners' records, internal legal notes, unrelated leads |
| **Broker / channel partner (CP)** | Submit listings; view own submissions; view leads specifically assigned/shared; update permitted follow-ups | All platform leads, private owner documents, other CPs' portfolios |
| **Inside sales** | Work assigned leads; log calls/tasks/outcomes; schedule site visits | Legal vault unless separately permitted |
| **Listing reviewer** | Review listing content/media; request changes; approve/reject publication | Full legal vault unless permission granted |
| **Research analyst** | Record source checks, identifiers, evidence, rates and comps | Owner identity documents unless necessary and authorised |
| **Legal reviewer** | Review assigned documents; record scope/limitations/issues | Unassigned case documents |
| **Field executive** | Assigned visit checklist, location, photos, observations | Unrelated CRM/identity data |
| **Admin / operations** | Queues, users, listing configuration, assignment and audit | No bypass of audit; privileged actions must be logged |
| **Super-admin** | System configuration and role management | Must use MFA and audited break-glass access |

Implement **RBAC plus record-level ownership/assignment rules**. Use least privilege, server-side
authorization on every request, MFA for privileged roles, and immutable audit events for sensitive
actions.

---

## 4. Recommended architecture and stack

| Layer | Recommended baseline | Notes |
|---|---|---|
| Web UI | Next.js + React + TypeScript + Tailwind + shadcn/ui | Responsive owner/broker portal, public marketplace, admin console, CRM |
| Backend API | NestJS + TypeScript; REST/JSON; OpenAPI/Swagger | Modular monolith first; split services only when scale justifies it |
| Database | PostgreSQL + PostGIS | Relational core, geospatial point/polygon queries, full-text search initially |
| Search | PostgreSQL FTS + PostGIS in Phase 1; OpenSearch later if needed | Do not add search infrastructure until query volume warrants it |
| Media/document storage | S3-compatible object storage; MinIO for local/dev or managed S3-compatible | Private buckets for legal docs; signed URLs; image derivatives |
| Background jobs | Redis + BullMQ | Image processing, notifications, OCR, imports, dedupe and scheduled jobs |
| Authentication | OIDC-compatible auth; Auth.js or Keycloak | Secure session cookies; avoid custom password cryptography |
| Maps | MapLibre GL JS + approved tile provider; optional Google Maps adapter | Tiles/geocoding/imagery have separate licences and cost controls |
| Observability | OpenTelemetry + structured logs + error tracker + uptime checks | Redact tokens, personal data and document content from logs |
| Deployment | Docker; CI/CD; managed PostgreSQL; separate dev/staging/production | Infrastructure as code; backups and restore tests |

Prefer a **modular monolith** with bounded modules: Identity, Listings, Media, Documents, Review,
Research, Marketplace/Search, Enquiries, CRM, CP Network, Notifications, Integrations, Analytics,
Audit. Define interfaces/adapters for external vendors.

Do not expose API keys in browser bundles except keys explicitly designed for public client use and
restricted by referrer/domain. All secret-bearing calls must be server-side.

---

## 5. Core data model / entities

- **User:** id, name, phone, email, auth_subject, status, created_at, last_login_at.
- **Organisation:** id, legal_name, type (brokerage/builder/owner company), GSTIN optional, status.
- **Membership:** user_id, organisation_id, role, scope, active_from/to.
- **BrokerProfile:** user_id, operating_states/districts, languages, experience, verification status,
  consent/preferences.
- **PropertyListing:** id, public_slug, created_by, owner_id, broker_id, listing_type, asset_type,
  tenure/ownership claim, title, description, price_min/max, price_basis, currency, area_value/unit,
  dimensions, facing, road_width, land_use_claim, availability_status, workflow_status, published_at.
- **PropertyLocation:** listing_id, state, district, subdistrict/circle/anchal/taluk/tehsil,
  village/mouza/locality, address_text, latitude, longitude, pin_precision, location_source, optional
  polygon geometry.
- **LandIdentifier:** listing_id, identifier_type, identifier_value, state-specific metadata,
  source/entered_by, verified_status. Store multiple identifiers; do not force one national schema.
- **MediaAsset:** id, listing_id, type, original_object_key, derivative_object_key, captured_at,
  uploaded_by, rights/consent declaration, processing_status, ai_generated_or_enhanced flag, provenance.
- **DocumentAsset:** id, listing_id, document_type, private_object_key, checksum, uploaded_by,
  consent_basis, sensitivity, retention_rule, review_status.
- **ReviewCase / ReviewEvent:** listing/document review status, assigned reviewer, reason, evidence,
  timestamps, decisions, immutable history.
- **ResearchCase / EvidenceRecord:** source name, source URL/reference, portal, query identifiers,
  result summary, date accessed, source timestamp if available, screenshot/file reference where
  permitted, researcher, confidence, limitations.
- **RateObservation:** locality/district, rate type (circle/guideline/asking/registered
  comparable/agent estimate), amount per unit, effective date, source, methodology, confidence; never
  mix unlike rate types.
- **ComparableObservation:** property attributes, location precision, price, price basis, observation
  date, source, transaction/asking status, quality/confidence.
- **Lead/Enquiry:** listing_id, contact details, consent text/version, channel/source/campaign,
  assigned_to, status, qualification fields, created_at, dedupe key.
- **LeadActivity:** call/message/task/site visit/outcome, actor, timestamp, next action, notes with
  access controls.
- **ChannelPartnerShare:** listing/lead, CP, permission scope, expiry, attribution, revocation reason.
- **Notification, IntegrationJob, WebhookEvent, AuditEvent, ConsentRecord, DataExportRequest.**

Use UUIDs, UTC timestamps, created_at/updated_at, soft-delete where justified, explicit retention
rules, and database migrations. **Store money as integer minor units or DECIMAL — not floating-point.**
Store dimensions with unit plus normalized conversion values. Maintain source provenance and status
history.

---

## 6. Property submission UX and validation

### 6.1 Required in Phase 1
- **Listing type:** land/plot, residential, commercial, agricultural, industrial, project inventory
  (configurable).
- **Transaction:** sale/lease; price or price range; currency INR; price basis (total/per unit) and
  negotiability.
- **Location:** state, district, local administrative fields where known, map pin, pin precision,
  locality/village/mouza; show pin on confirmation map.
- **Size:** plot dimensions where known, total area and unit (sq ft, sq yd, acre, decimal, katha,
  bigha, hectare, etc.). State/district-specific conversions must be configurable and visibly
  qualified because local units vary.
- **Description and attributes:** road access, road width, frontage, facing, land-use claim,
  utilities, boundary/fencing, occupancy/possession status, nearby landmarks.
- At least one photo or allow draft-only submission until media is added; support photos and video
  with file-type/size limits.
- **Submitter role and authority:** owner, authorised representative, broker/CP; declaration that
  information is accurate and submitter has authority/permission to list.
- **Contact/consent:** phone verification (OTP) before publication; consent to be contacted; privacy
  notice acknowledgement.

### 6.2 Optional legal / land details form
- **Document type:** sale deed, title deed, encumbrance certificate, mutation/jamabandi,
  khata/khatauni, survey map, tax receipt, conversion/land-use order, layout approval, POA/authority,
  other.
- **State-specific identifiers:** plot/survey number, khesra number, khata number,
  jamabandi/khatauni, mouza/village, circle/anchal/tehsil/taluk, registration/sub-registrar office,
  deed number/year, district and state.
- Document uploads are optional; users can submit identifiers without uploading files. **Never imply
  that entering an identifier guarantees an online record lookup.**
- Collect only what is necessary. Keep identity documents and deeds private by default. Redact/limit
  public display and support restricted internal access.

**Form design:** save draft, resumable multi-step wizard, autosave, mobile-first media upload,
field-level validation, conditional fields by state/property type, duplicate warning, pin correction,
preview before submission, explicit publication consent.

---

## 7. Listing workflow and distinct review states

| Workflow | Meaning / allowed next step |
|---|---|
| DRAFT | Editable by creator; not publicly visible |
| SUBMITTED | Ready for listing-content review |
| NEEDS_CORRECTION | Reviewer has returned specific actions; creator can edit and resubmit |
| CONTENT_REVIEWED | Required listing fields and media reviewed; not a legal conclusion |
| APPROVED_TO_PUBLISH | Allowed to publish if policy checks pass |
| PUBLISHED | Public listing page is active |
| PAUSED / EXPIRED / SOLD / WITHDRAWN | Listing removed from active search but history retained per policy |
| DOCUMENTS_RECEIVED | Documents uploaded; no quality/title conclusion |
| DOCUMENT_REVIEW_IN_PROGRESS | Assigned reviewer checking a defined document scope |
| DOCUMENT_REVIEW_COMPLETED | Review completed with scope, evidence and limitations stated |
| PUBLIC_RECORD_CHECKED | A specific public record/source was checked on a stated date; not a title guarantee |
| FIELD_VISIT_COMPLETED | Visit checklist and observations recorded |
| LEGAL_REVIEW_COMPLETED | Qualified reviewer recorded conclusion/limitations; platform still must not guarantee title |
| REJECTED / FLAGGED | Policy, fraud, mismatch or material concern; reason and appeal/escalation path recorded |

Keep publication status **separate** from document/record/field/legal review statuses. UI badges must
be explicit, e.g., "Listing details reviewed", "Public record checked on [date]", "Field visit
completed [date]". **Do not use a single green "Verified" badge.**

---

## 8. API standards and versioning

- **Base path:** `/api/v1`. All endpoints use JSON unless uploading binary files directly to object
  storage.
- **REST naming:** nouns, plural resources, HTTP methods; consistent status codes and error shape.
- **Authentication:** secure HttpOnly session cookies for browser; OAuth/OIDC bearer tokens for
  trusted integrations; short-lived access tokens where used.
- **Authorization:** enforce role + record ownership/assignment at API layer; never trust
  client-supplied user_id/role.
- **Pagination:** cursor-based for large collections; filter/sort parameters documented in OpenAPI.
- **Idempotency-Key** for lead creation, payment-like actions and retryable integrations; request IDs
  and trace IDs.
- **Webhooks:** signatures, timestamp validation, replay protection, retry policy and dead-letter queue.
- **Rate limits** on OTP, search, public enquiry, login, upload-url generation and external lookups.
- Use structured validation schemas, consistent error codes, audit logging and API deprecation policy.
- Generate **OpenAPI 3.1** spec and a Postman/Bruno collection; CI must fail on breaking API changes
  without versioning.

**Example error response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "requestId": "req_...",
    "details": [{ "field": "location.latitude", "issue": "required" }]
  }
}
```

---

## 9. Phase-by-phase API / integration catalogue

### Phase 0 — discovery, UX prototype and engineering foundation
- **Internal APIs:** health/readiness, feature flags, configuration, audit trail, user/role bootstrap,
  schema migrations.
- **External APIs:** none required to validate core flows. Use mocked fixtures for maps, SMS and
  government-record results in the clickable prototype.
- **Deliver:** architecture decision records (ADRs), data dictionary, threat model, clickable screens,
  OpenAPI skeleton, environments and CI pipeline.

### Phase 1 — marketplace MVP + listing moderation + enquiries

| Integration/API | Required use | Implementation guidance |
|---|---|---|
| Map rendering | MapLibre GL JS + approved tile source OR Google Maps JS API | Select provider after terms, attribution, usage limits and cost review. Keep behind a map adapter. |
| Geocoding / reverse geocoding | Provider Geocoding API or self-hosted Nominatim | Do not build commercial production autocomplete on public Nominatim. Cache; evaluate a paid provider or self-host. |
| Media upload | S3-compatible object storage API (pre-signed PUT/GET) | Browser uploads via short-lived signed URLs; private document bucket; malware scan and MIME validation. |
| OTP / SMS | Indian transactional SMS/OTP vendor API | Provider with DLT/India compliance; isolate in SmsProvider interface; never hard-code credentials. |
| Email | SMTP or transactional email provider API | Verify sender domain, SPF, DKIM, DMARC; templates and delivery events. |
| WhatsApp (optional in MVP) | WhatsApp Business Platform Cloud API via Meta or BSP | Only with opt-in/template approval; webhook ingestion; record message status and consent. |
| Analytics | First-party event endpoint; optional privacy-aware tool | Track funnel events without sending sensitive documents or unnecessary personal data. |
| Internal API | Auth, listings, media, search, enquiries, moderation, notifications, audit | See endpoint catalogue (§10). |

### Phase 2 — CRM, broker/CP network, lead assignment
- Internal endpoints: `/leads`, `/lead-activities`, `/tasks`, `/site-visits`, `/channel-partners`,
  `/lead-shares`, `/campaigns`, `/imports`, `/reports`.
- External: WhatsApp Cloud API for opted-in messaging; SMS/email provider; optional telephony/call
  logging; CSV/XLSX import and export.
- Optional click-to-call/telephony only after evaluating Indian number support, consent, call
  recording law, webhooks and per-minute costs. Store call metadata, not recordings by default.
- Import existing broker/CP database with source, lawful basis/consent status, dedupe, suppression
  list, opt-out and outreach audit. Do not mass-message a database without a documented compliant basis.
- Use webhook events for delivered/read/failed states; process asynchronously and idempotently.

### Phase 3 — document review, research and field visits
- Internal endpoints: `/document-assets`, `/review-cases`, `/evidence-records`, `/research-cases`,
  `/field-visits`, `/land-identifiers`, `/record-checks`.
- OCR: self-hosted (Tesseract/PaddleOCR) or managed, chosen after privacy & quality tests. OCR output
  is a suggestion; humans confirm identifiers.
- PDF/image processing: ClamAV/managed malware scan; PDF metadata & page-count checks; redact
  sensitive fields in derivative previews.
- Government record lookup: build a source-specific adapter only after confirming official API/access
  terms. Otherwise a documented manual-research workflow (source URL, identifiers, access date,
  reviewer, permitted evidence).
- Field visit: mobile-friendly offline-tolerant checklist, GPS capture with consent, timestamp, photo
  provenance, observations and discrepancy escalation.

### Phase 4 — land intelligence, circle rates, comparables, valuation
- Internal endpoints: `/rate-observations`, `/comparables`, `/valuation-reports`, `/imagery-evidence`,
  `/locality-profiles`, `/data-source-catalogue`.
- Rate sources: official circle/guideline rates by state/district/locality + effective date; capture
  official source and update timestamp.
- Comparables: source and date must distinguish asking price, agent quote, registered transaction,
  auction, or verified deal. Do not blend without stated methodology.
- Valuation engine: transparent rule-based estimates and comparable ranges; show methodology, sample
  count, time window, location radius, adjustment factors and confidence. **Label as indicative** —
  not an appraisal or guaranteed sale price.
- Maps/GIS: PostGIS spatial filters; approved tile/imagery provider; optionally licensed parcel
  boundaries. Do not scrape or redistribute imagery contrary to terms.

### Phase 5 — AI media assistance and research summarisation
- Vision API (optional): image description, duplicate detection, visible-text extraction,
  summarisation — behind an adapter; output must be reviewed.
- Image editing/generation (optional): preserve originals, store generated derivatives separately,
  mark AI-enhanced/illustrative, retain model/provider/prompt/job metadata, and **prohibit misleading
  alterations** (boundaries, roads, buildings, surroundings).
- LLM/RAG (optional): retrieval over permitted internal research records with source citations and
  access filtering. Never bypass document permissions.
- Image quality jobs: resize, thumbnail, EXIF handling, perceptual-hash dedupe, moderation, safe formats.
- Street View/satellite/historical imagery: only via licensed/authorised APIs; do not assume rights
  to cache, export or resell.

### Phase 6 — VR/immersive sales
- Start with WebGL/WebXR browser tours and 360° media; later Meta Quest/WebXR or Unity client via the
  same listing/project API.
- Internal endpoints: `/tours`, `/tour-scenes`, `/tour-assets`, `/tour-sessions`, `/tour-events`,
  `/vr-lead-attribution`.
- Media delivery: CDN with access-controlled assets; optimise glTF/GLB; lazy-load scenes; 2D fallback.
- VR events may capture scene viewed, dwell time, hotspots, CTA clicks — with consent/analytics
  disclosure. **VR does not establish dimensions, construction status or legal title.**

---

## 10. Suggested REST endpoint catalogue

| Method & path | Purpose | Access |
|---|---|---|
| `POST /api/v1/auth/otp/request` | Request login/verification OTP | Public, rate-limited |
| `POST /api/v1/auth/otp/verify` | Verify OTP / establish session | Public, rate-limited |
| `GET /api/v1/me` | Current profile and permissions | Authenticated |
| `POST /api/v1/listings` | Create draft listing | Owner/broker/CP |
| `PATCH /api/v1/listings/{id}` | Edit permitted listing fields | Owner/creator or assigned staff |
| `POST /api/v1/listings/{id}/submit` | Submit for content review | Owner/broker/CP |
| `GET /api/v1/listings/{id}` | Get listing per caller permissions | Scoped |
| `GET /api/v1/public/listings` | Public search/filter/map results | Public; published-only fields |
| `GET /api/v1/public/listings/{slug}` | Public listing detail | Public; published-only fields |
| `POST /api/v1/listings/{id}/media-upload-url` | Create signed upload URL | Listing owner/authorised staff |
| `POST /api/v1/listings/{id}/documents` | Register private document metadata/upload | Owner/authorised staff |
| `POST /api/v1/listings/{id}/enquiries` | Create buyer enquiry | Public; rate-limited; consent required |
| `GET /api/v1/admin/review-queue` | Moderation queue | Reviewer/admin |
| `POST /api/v1/admin/listings/{id}/decision` | Approve, reject, request correction | Reviewer/admin; reason required |
| `POST /api/v1/listings/{id}/research-cases` | Open research case | Research/admin |
| `POST /api/v1/research-cases/{id}/evidence` | Attach evidence metadata | Research/legal |
| `POST /api/v1/record-checks` | Record a public-record lookup result | Research/legal |
| `GET /api/v1/leads` | List permitted assigned leads | Inside sales/authorised CP |
| `PATCH /api/v1/leads/{id}` | Update lead status/qualification | Assigned user/manager |
| `POST /api/v1/leads/{id}/activities` | Log call, task, message or note | Assigned user |
| `POST /api/v1/leads/{id}/site-visits` | Schedule site visit | Inside sales/CP |
| `POST /api/v1/leads/{id}/shares` | Share a lead with a CP (scope/expiry) | Manager/admin |
| `GET /api/v1/reports/funnel` | Funnel/report data | Role-scoped |
| `POST /api/v1/webhooks/{provider}` | Provider webhook receiver | Signed provider only |
| `GET /api/v1/health` | Liveness | Internal/load balancer |
| `GET /api/v1/ready` | Dependency readiness | Internal/load balancer |

Every endpoint must be described in OpenAPI with request/response schemas, auth, error codes, rate
limits, audit effects and examples. The list is a baseline, not permission to skip design.

---

## 11. Example payloads

**11.1 Create listing (illustrative):**
```json
{
  "listingType": "LAND_PLOT",
  "transactionType": "SALE",
  "title": "Residential plot near [locality]",
  "price": { "min": 4500000, "max": 5000000, "currency": "INR", "basis": "TOTAL" },
  "area": { "value": 2400, "unit": "SQ_FT" },
  "location": {
    "stateCode": "IN-KA", "district": "Bengaluru Urban",
    "locality": "[locality]", "latitude": 12.9, "longitude": 77.6,
    "pinPrecision": "USER_DROPPED_PIN"
  },
  "landIdentifiers": [],
  "features": { "roadAccess": "UNKNOWN", "facing": "EAST" },
  "authorityDeclarationAccepted": true,
  "contactConsent": { "accepted": true, "noticeVersion": "2026-10-01" }
}
```

**11.2 Record check (illustrative):**
```json
{
  "listingId": "uuid",
  "identifier": { "state": "IN-BR", "district": "Vaishali", "village": "example", "khata": "entered-value", "khesra": "entered-value" },
  "source": { "name": "Official portal name", "url": "https://official-source.example", "accessMethod": "MANUAL_REVIEW" },
  "accessedAt": "2026-10-10T10:30:00Z",
  "result": "RECORD_FOUND",
  "summary": "Summary of what the source displayed; do not copy beyond permitted use.",
  "limitations": ["Record identity and title not independently certified"],
  "reviewerId": "uuid",
  "confidence": "MEDIUM"
}
```
Examples are illustrative. Define enums, validation, precision, identifier types and error handling in
the final OpenAPI spec; do not use example coordinates/values as production data.

---

## 12. External API and provider decision register

| Capability | Preferred shortlist | Decision gate / cautions |
|---|---|---|
| Maps & geocoding | MapLibre + licensed tile/geocoding; Google Maps Platform (commercial) | Review India pricing, terms, attribution, storage/caching, geocoding restrictions, quota alerts. Restrict keys. |
| Open map data | OpenStreetMap; self-host Nominatim or contracted geocoder at scale | Public Nominatim has a strict usage policy; not a free unlimited production geocoder. |
| SMS/OTP | Indian provider with DLT/OTP support | Confirm DLT templates, sender IDs, delivery webhooks, price, OTP expiry and abuse controls. |
| WhatsApp | Meta WhatsApp Business Platform Cloud API or approved BSP | Business setup, opt-in, template approval for business-initiated, webhook signature validation, status processing. |
| Email | SMTP or transactional provider | SPF/DKIM/DMARC, bounce handling, unsubscribe/consent. |
| Object storage | MinIO for dev; S3-compatible managed for production | Private legal-doc bucket, encryption, lifecycle policies, signed URLs, malware scanning, backups. |
| OCR | Tesseract/PaddleOCR self-hosted; evaluate managed | Benchmark Indian scripts and document quality; OCR is not legal interpretation. |
| AI vision/image | OpenAI API or alternate behind an adapter | Review data processing terms, retention, residency, cost; human review; preserve originals/provenance. |
| Government land records | Official state portals/APIs only where authorised | No universal all-India land-record API. Build state connectors after written/terms validation; else manual evidence. |
| Satellite/street imagery | Provider-authorised imagery API/licence | Do not scrape Google Earth/Maps; do not assume rights to cache, export or resell. |
| Payments (future) | Razorpay or RBI-regulated PSP | Not required for MVP. Add after business model, refunds, invoices, compliance are defined. |
| VR | WebXR/Three.js; Unity/Meta Quest later | No headset API needed for Phase 1; use asset/tour API contracts now. |

External API keys, accounts, billing, domain ownership and production credentials should be held by
the **business**, not a developer's personal account. Use a secrets manager/environment variables and
rotate credentials on handover.

---

## 13. Government records, legal review and data provenance

- Create a **GovernmentSource registry** per state: source name, official URL, jurisdiction, record
  types, permitted access method, login/CAPTCHA constraints, rate limits, terms-reviewed date, last
  successful test, owner and fallback procedure.
- Do not assume portals provide public APIs. **No CAPTCHA bypass, credential sharing, terms-violating
  scraping, or automated bulk extraction without permission.**
- Store what was searched, which identifiers were used, when the source was accessed, the result,
  evidence reference if permitted, researcher, and limitations.
- Separate 'record found', 'identifier matched', 'document reviewed', 'field visit completed', and
  'legal review completed'. A portal record is not automatically conclusive proof of ownership or
  absence of encumbrances.
- Use qualified legal professionals for legal conclusions; capture reviewer qualification, scope,
  date, documents examined, exclusions and open issues.
- Provide correction/escalation workflows for mismatch, disputed ownership, forged media/documents,
  duplicate/expired listings and complaints.
- Circle rates / guideline values are government valuation references for specific purposes and
  periods, **not** market value. Any appreciation forecast must be labelled an estimate — source
  date, assumptions, range, confidence — not a guarantee.

---

## 14. Security, privacy and compliance requirements

- HTTPS everywhere, secure headers, CSRF protection with cookie auth, strict CORS, input validation,
  output encoding, parameterised queries.
- Enforce **MFA for admin/legal roles**; least privilege; session expiry; password/OTP abuse
  protection; account lockout/risk controls; audit privileged access.
- Encrypt in transit and at rest; private object buckets; short-lived signed URLs; document access
  logging; malware-scan uploads; file-size/type allowlists.
- **Never expose** deeds, identity documents, private phone numbers, internal notes, raw source
  documents or owner identity details in public API responses.
- Consent notices with version/time; record contact permissions and opt-outs; retention/deletion
  schedules; access/correction/deletion request handling as applicable.
- Review **India DPDP Act**/rules and other obligations with counsel before launch; purpose
  limitation, minimisation, access controls, processor agreements, breach response.
- Protect against IDOR/BOLA, SQL injection, XSS, CSRF, SSRF, upload malware, webhook spoofing, OTP
  brute force, mass enumeration, scraping and CSV formula injection.
- Backups: encrypted automated backups, PITR where available, documented RPO/RTO, quarterly restore
  test, incident-response contacts.
- Before launch: dependency scanning, secret scanning, static analysis, API security tests,
  role-based negative tests, upload testing, penetration test / independent review, DR restore drill.

---

## 15. Admin and operational workspaces

- **Listing moderation:** queue, filters, duplicate hints, map preview, media gallery, checklist,
  decision reasons, correction requests, status history.
- **Document/legal review:** private document viewer, extracted text (if OCR), reviewer assignment,
  issue checklist, access logging, scoped outcome template.
- **Research desk:** source catalogue, lookup checklist by state, identifier variants, rate
  observation entry, evidence attachments, source timestamps, confidence.
- **Field operations:** assignment, visit schedule, checklist, GPS and media capture, discrepancy
  flags, follow-up task.
- **CRM:** lead list, assignment, pipeline, activities, next task, reminders, site visit, lost reason,
  source attribution, duplicate merge, manager dashboard.
- **CP management:** onboarding, profile, territory, agreement/consent, permitted inventory,
  lead-sharing permissions, performance, suspension, opt-out.
- **Operations:** users/roles, configuration, failed jobs/webhooks, integration health, data import
  errors, audit search, privacy requests, incident log.

Every decision that changes public status, grants access, exports data, shares a lead, or accesses
sensitive documents must create an audit event.

---

## 16. Lead CRM rules and existing database import

- Lead stages baseline: `NEW → ATTEMPTING_CONTACT → CONTACTED → QUALIFIED / NURTURE →
  SITE_VISIT_BOOKED → SITE_VISIT_DONE → NEGOTIATION → WON / LOST / DISQUALIFIED`.
- Qualification fields: intent, budget range, preferred locations/property type, purchase timeline,
  funding readiness (optional), source/campaign, next action, lost reason.
- Assign lead owner and SLA; log each call/message/task; create reminders; report ageing and overdue
  follow-ups.
- Deduplicate by normalised phone/email + controlled fuzzy matching; never silently merge records
  without a reviewable audit trail.
- Existing broker/CP database import: field mapping, sample import, dedupe preview, validation report,
  source provenance, opt-out/suppression handling, staged batch import and rollback.
- Lead-sharing must be explicit and scoped: who can view, which fields, purpose, expiry, attribution,
  revocation. **Do not make all leads visible to all brokers.**
- For marketing integrations, capture UTM parameters and campaign/source IDs. Ad platform conversion
  APIs are optional and only after consent, data-minimisation and platform policy review.

---

## 17. Analytics and reporting

| Dashboard | Metrics |
|---|---|
| Marketplace | Listings by state/district/type/status; search-to-enquiry conversion; stale listings; map-pin quality |
| Moderation | Review queue ageing; correction loops; rejection reasons; reviewer throughput |
| Research | Cases open/closed; source coverage; freshness; evidence completeness; unresolved discrepancies |
| CRM | Leads by source/CP/listing; contact SLA; qualified rate; site visits; stage conversion; lost reasons; pipeline ageing |
| Channel partners | Active CPs; listings submitted; enquiries shared; response rate; site visits; attributed wins; complaints/opt-outs |
| Operations | API latency/errors; job failures; upload failures; webhook retries; integration cost/usage; storage growth |
| Trust & safety | Duplicate/fraud flags; complaints; takedown time; sensitive-document access; access anomalies |

Use role-scoped dashboards. Report definitions must be written down (e.g., a 'qualified lead' needs a
fixed criterion rather than individual interpretation).

---

## 18. Testing, acceptance criteria and release gates

**Phase 1 acceptance**
- A new owner/broker can register, verify phone, save a draft, add location/map pin, price, area/unit,
  media and submit.
- Optional legal form can be skipped. If identifiers/documents are added, they remain private by
  default and visible only to permitted roles.
- Admin can review, request corrections with reasons, approve/reject, publish/unpublish and view full
  status history.
- Public search returns only published listings; filters include location, type, price range, area;
  map/list synchronisation works.
- Public enquiry creates a lead with consent and source attribution, rate limiting, duplicate
  handling and audit metadata.
- Role-negative tests prove one owner/CP cannot access another owner's private listing/documents/leads
  by guessing IDs.
- OpenAPI spec, migrations, environment setup, seeded demo data, CI tests, backup/restore
  instructions and deployment guide are delivered.

**Phase 2 acceptance**
- Inside sales can assign leads, add activities/tasks, change stages, schedule site visits, view
  overdue follow-ups.
- CP sees only assigned/shared leads and approved inventory; share can expire/revoke; all access
  audited.
- Bulk import includes preview, validation, dedupe report and rollback procedure.
- Messaging integrations record consent, template/provider IDs, delivery status and webhook retries;
  failed events visible to operations.

**Phase 3+ acceptance**
- Each source check stores source URL, query identifiers, accessed date, result, reviewer, confidence
  and limitations.
- OCR fields are marked machine-extracted until human-confirmed; original document preserved.
- Valuation report separates circle/guideline rate, asking prices, registered comparables and model
  estimate.
- AI-enhanced media is visibly labelled, original retained, provenance stored, prohibited misleading
  alterations tested.
- VR tour loads with a 2D fallback, accessible controls and analytics consent.

**Release gates:** code review; automated tests; staging UAT; security checklist; migration/rollback
plan; backup restore check; monitoring/alerts; owner sign-off; production smoke tests.

---

## 19. Delivery plan and phase boundaries

| Phase | Scope | Exit deliverables |
|---|---|---|
| 0. Foundation & prototype | Workshops, screen flows, schema, architecture, OpenAPI skeleton, deployment foundation | Approved backlog, clickable prototype, ADRs, data dictionary, test plan |
| 1. Marketplace MVP | Auth, listing submission, map pin, media, optional documents, moderation, public search/detail, enquiry capture, notifications | Deployed staging/production, admin guide, API spec, tests, source code |
| 2. CRM & CP network | Lead pipeline, activities, tasks, site visits, CP profiles, permissions, import, reporting | CRM usable by inside sales and pilot CP group |
| 3. Verification workspace | Document cases, evidence register, source catalogue, manual record research, field visit workflow | Traceable review process with clear status labels |
| 4. Land intelligence | Rates, comparables, source freshness, locality profiles, transparent estimate reports | Pilot geography data with methodology/confidence |
| 5. AI assistance | OCR, image QA/enhancement, summarisation, research assistant | Human review, provenance, cost/quality controls |
| 6. VR & advanced commerce | Web tours, WebXR/Quest client, builder inventory, attribution | Tour authoring/hosting and measurable lead attribution |

Do not commit to a fixed calendar until the developer completes a technical discovery and dependency
estimate. For a fast demo, build a narrow vertical slice with seeded data and mocked external
services; do not label it production-ready.

---

## 20. Developer handover checklist

- ☐ Repository under business-controlled Git organisation; main branch protection and PR review.
- ☐ Environment setup: `.env.example` only; no secrets in repository; secret manager for deployed envs.
- ☐ Architecture diagram, ERD, data dictionary, API/OpenAPI spec and Postman/Bruno collection.
- ☐ DB migrations, seed script, test users for each role, demo listings and demo research records.
- ☐ CI/CD pipeline, Docker files, deployment runbook, rollback procedure and backup/restore guide.
- ☐ Test suite: unit, integration, API contract, role/permission, upload, webhook retry and smoke tests.
- ☐ Provider register with account owner, key scope, billing alert, quota, data retention, terms-review date.
- ☐ Runbooks for listing disputes, data breach, lost access, provider outage, failed import, takedown request.
- ☐ Source code, UI assets, prompts, model configs, schemas and infrastructure code transferred to business.
- ☐ Written handover session and unresolved-risk register; no undocumented developer-only dependency.

Business owner must own domain/DNS, cloud accounts, database/storage accounts, maps provider,
SMS/email/WhatsApp accounts, AI API account, Git organisation, analytics and billing. Grant developers
scoped access; remove access after handover.

---

## 21. Key assumptions and decisions to close during kickoff

- Final brand/domain and initial public-facing language.
- Initial launch districts in Bihar and Karnataka; whether other northern states are pilot or later.
- Which property categories are in scope at launch; whether builder project inventory is in MVP.
- Pricing model: free listings, paid promotion, subscription, lead fees, brokerage/commission or mixed.
- Who may view owner identity/contact data and when; whether public listings mask phone numbers.
- Exact review checklist and authority for content approval, field visit and legal review.
- Map/geocoding vendor and approved imagery rights; monthly usage budget and cost alerts.
- SMS/OTP, email, WhatsApp vendor, business verification and opt-in language.
- Data retention and deletion schedule; legal counsel review of privacy/terms and listing declaration.
- Who maintains circle rates and comparable observations; update cadence and evidence standard.
- Expected launch volumes, concurrent users, file/video size limits, availability targets, recovery objectives.
- Hosting region, support model, uptime target, budget and named product owner.

The developer should proceed with Phase 0 and Phase 1 after kickoff, using mocks/adapters for external
services until accounts and terms are approved. Unknown government API access is a tracked dependency,
not a reason to block marketplace delivery.

---

## 22. API/provider reference links

- Google Maps Platform pricing and billing — https://developers.google.com/maps/billing-and-pricing
- Google Maps Platform India pricing — https://mapsplatform.google.com/intl/en_in/pricing/
- OpenStreetMap Nominatim usage policy — https://operations.osmfoundation.org/policies/nominatim/
- Google Earth / Maps additional terms — https://www.google.com/help/terms_maps-earth/
- Google Earth Engine terms — https://earthengine.google.com/terms/
- OpenAI image and vision API guide — https://developers.openai.com/api/docs/guides/images-vision
- WhatsApp Business Platform webhook reference — https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference
- OpenAPI specification — https://spec.openapis.org/oas/latest.html
- PostGIS documentation — https://postgis.net/documentation/
- MapLibre GL JS documentation — https://maplibre.org/maplibre-gl-js/docs/
- NestJS documentation — https://docs.nestjs.com/
- Next.js documentation — https://nextjs.org/docs

Links are a starting point, not a substitute for current contracts, service-specific terms, account
setup or legal review. Re-check before procurement and production deployment.

---

## Appendix A — Minimum API conventions

- Success responses: resource representation or a standard list envelope with `data`, page/cursor,
  `requestId`.
- Errors: stable machine code, human message, `requestId`, field-level details; never expose stack
  traces or secrets.
- `201 Created` for creation, `202 Accepted` for async jobs, `204 No Content` for successful no-body
  deletes/actions, `400/422` validation, `401` unauthenticated, `403` forbidden, `404` absent/not
  visible, `409` conflict/duplicate, `429` rate limit, `5xx` server/provider error.
- ETag/If-Match or `updated_at` version checks for conflict-prone edits.
- Webhook processing: verify signature, store raw event with restricted access, dedupe event ID,
  enqueue processing, respond quickly, retry internally.
- Long-running research/OCR/image jobs return a job ID and status; poll `/jobs/{id}` or use in-app
  notifications.
- All timestamps ISO 8601 UTC. All API schemas include nullable/optional semantics and enum docs.

**Example async job response:**
```json
{ "jobId": "uuid", "status": "QUEUED", "statusUrl": "/api/v1/jobs/uuid", "requestId": "req_..." }
```

## Appendix B — Glossary

| Term | Meaning |
|---|---|
| RBAC | Role-based access control |
| BOLA / IDOR | Broken object-level authorization / insecure direct object reference |
| API adapter | Internal interface that isolates vendor-specific API implementation |
| Signed URL | Time-limited URL granting scoped access to an object |
| PostGIS | PostgreSQL spatial extension for location/geography queries |
| OCR | Optical character recognition; extracted text can be inaccurate |
| RAG | Retrieval-augmented generation using permissioned source records |
| CP | Channel partner / broker distribution partner |
| Circle rate | Government guideline value used for specified purposes; not necessarily market price |
| Evidence provenance | Source, access time, identifiers, reviewer, method and limitations for a research claim |
| OpenAPI | Machine-readable API contract used for documentation, testing and client generation |
| Webhook | Provider-initiated HTTP event notification |
| WebXR | Browser APIs for immersive VR/AR experiences |
