# Real Estate CRM — Product Requirements Document (PRD) Brief

**Functional Scope & First-Cut Build Brief · Version 1.0 | 10 October 2026 | Working draft**

> Source reference document. A related brief for a **Bangalore-focused real estate sales/consulting
> CRM**. Its CRM/lead/automation requirements inform the CRM phase of this platform (see
> [handover-spec.md](handover-spec.md) §16 and [PRD.md](PRD.md) roadmap). Internal working brief —
> a requirements document, not a final architecture or a commitment that every third-party
> integration is available without provider approval. Confirm integrations and access before
> implementation.

**Business context:** a Bangalore-focused real estate sales and consulting business offering
apartments, new-launch projects and gated plot communities, with a future path toward exclusive
builder inventory partnerships and Dubai property consulting.

---

## 1. Executive Summary

Build a web-based CRM and marketing operations workspace for a growing real estate sales and
consulting business. It should centralise bulk lead data, day-to-day lead handling, property/project
inventory, deal progression, campaign performance and automated follow-up. It should work for a small
team initially but support additional sales users, partner channels, builder relationships and future
geography expansion.

> The user's explicit left-navigation priorities are: **(1) Raw Data / Bulk Data, (2) Marketing
> Dashboard, (3) Automation / Workflow.** Treat these as core modules, not secondary add-ons.

**Business model and rollout**
- **Phase 1 — Bangalore:** flats/apartments, new launches, gated plot communities, lead
  qualification, site visits, negotiation and booking support.
- **Phase 2 — Builder partnerships:** project-wise inventory, partner/referral tracking, exclusive
  inventory or exclusive sales mandates where contractually agreed.
- **Phase 3 — Dubai:** international projects, currency and location fields, NRI/investor segments and
  future partner workflows. Dubai-specific compliance and integrations require a separate review.

---

## 2. Goals and Success Measures

- Create one source of truth for leads, contacts, projects, campaign sources, follow-up history and
  deal status.
- Reduce missed follow-ups using task queues, reminders, drip campaigns and event-triggered
  communication.
- Make campaign spend and outcomes visible across connected ad and messaging channels, with
  lead-source attribution.
- Enable managers to see lead ageing, response speed, funnel conversion, team performance and
  project-level outcomes.
- Support bulk import, deduplication, segmentation, assignment and export with auditability and RBAC.

**Suggested KPIs**

| KPI | Definition / use |
|---|---|
| Lead response time | Time from lead creation/receipt to first recorded human/automated action. |
| Contact rate | Share of leads with a successful two-way contact or qualifying conversation. |
| Qualified lead rate | Qualified leads ÷ total leads, by source/campaign/project. |
| Site visit rate | Site visits booked and completed ÷ qualified leads. |
| Booking conversion | Bookings ÷ leads, qualified leads and/or completed site visits. |
| Cost per lead (CPL) | Campaign spend ÷ attributed leads; report attribution window and source. |
| Cost per qualified lead | Campaign spend ÷ qualified leads attributed to the campaign. |
| ROAS / revenue efficiency | Attributed revenue/commission ÷ campaign spend where reliable data exists. |

---

## 3. User Roles and Permissions

| Role | Typical permissions |
|---|---|
| Owner / Super Admin | Full configuration, users, integrations, all leads/projects, campaign data, reports, exports and audit logs. |
| Sales Manager | View team pipeline, assign/reassign leads, monitor follow-ups, approve selected actions, access team reports. |
| Sales Consultant | Access assigned leads, update qualification and stage, log calls/notes, schedule visits, manage assigned tasks. |
| Marketing User | Manage audiences, campaigns, UTMs, creative/campaign metadata and marketing dashboards; restricted access to sensitive lead fields as configured. |
| Operations / Data User | Import and clean bulk data, map fields, deduplicate, validate records and review import outcomes. |
| Channel Partner / Referral User (future) | Submit or view permitted leads and referral status without access to unrelated customer or campaign data. |

**Requirements:** role-based access control, least-privilege defaults, configurable field visibility,
record ownership, activity logs for important changes, and export permissions separated from general
viewing access.

---

## 4. Core Navigation / Information Architecture

| Navigation item | Purpose |
|---|---|
| Overview Dashboard | Top-level KPIs, lead funnel, pending tasks, campaign snapshot, team/project performance. |
| Raw Data / Bulk Data | Upload, inspect, clean, map, tag, deduplicate, segment, assign and export bulk lead datasets. |
| Leads & Contacts | Individual lead records, qualification, communication history, tasks and ownership. |
| Projects & Inventory | Builders, projects, units/plots, price ranges, availability, launch stage, amenities, collateral. |
| Pipeline / Deals | Visual stages from new lead to booking/won or lost; stage history and conversion reporting. |
| Marketing Dashboard | Connected channel performance, campaign tracking, attribution, and campaign launch/management entry points. |
| Automation / Workflow | Rules, triggers, wait steps, communication sequences, assignment logic and execution logs. |
| Tasks & Site Visits | Calls, follow-ups, meetings, site visits, reminders and outcomes. |
| Reports & Analytics | Source, campaign, team, geography, project, funnel and revenue/commission reports. |
| Integrations & Settings | Connected accounts, templates, field mapping, permissions, consent controls and audit logs. |

---

## 5. Raw Data / Bulk Data Module

Intended for high-volume lead acquisition and operations, not just a static spreadsheet viewer.

- **Import:** CSV/XLSX upload; field mapping; preview; required-field validation; row-level error
  report; import summary.
- **Data fields:** name, phone, email, city/area, budget, property type, purchase timeline, preferred
  project, source, campaign, UTM values, assigned owner, consent/opt-out status and custom fields.
- **Cleaning:** phone/email normalisation, duplicate detection, merge suggestions, invalid-record
  flagging and suppression-list checks.
- **Bulk actions:** assign/reassign, tag, segment, change status, add to workflow, export permitted
  fields and archive records.
- **Segmentation:** filters for location, budget, property type, purchase intent, source, campaign,
  lead stage, owner, last activity and consent status.
- **Governance:** import user/time, source file name, rows accepted/rejected, before/after change
  history and export audit.

**Acceptance criteria**
- A user can preview a file and map columns before records are created.
- The import reports created, updated, duplicate, rejected and skipped rows, with downloadable errors.
- Bulk actions show the affected record count and require confirmation for destructive/external
  communication actions.
- Suppression/opt-out rules are checked before campaign enrollment or outbound messaging.
- Large imports run asynchronously with visible progress and a completion notification.

---

## 6. Leads, Contacts and Pipeline

**Lead record**
- Identity and contact details; lead source/campaign/UTM; preferred property type, area, budget,
  configuration/plot size and buying timeline.
- Lead score and qualification fields; stage; assigned owner; next action and due date.
- Timeline of calls, notes, email/SMS/WhatsApp events, forms, site visits, meetings, stage changes
  and automation activity.
- Linked project(s), property/unit/plot interest, offer/quote notes and booking details where
  applicable.
- Consent status, opt-out history and channel-level communication preferences.

**Suggested default pipeline**

| Stage | Exit / update expectation |
|---|---|
| New | Lead captured; source and owner recorded or assignment queued. |
| Attempting Contact | Call/message attempt logged; next follow-up date set. |
| Contacted | Two-way contact recorded; needs discovery started. |
| Qualified | Budget, location/property preference and timeline sufficiently understood. |
| Project Shortlisted | One or more suitable projects/inventory options linked. |
| Site Visit Scheduled | Date/time, project, attendee and owner recorded. |
| Site Visit Completed | Outcome, objections and next action captured. |
| Negotiation | Commercial discussion, offer and decision timeline tracked. |
| Booking / Won | Booking evidence and commercial outcome captured. |
| Lost / Nurture | Lost reason or nurture reason captured; reactivation date optional. |

The pipeline must be configurable by business line or project type. Stage changes should be
timestamped and available for funnel reports.

---

## 7. Projects, Builders and Inventory

- Builder/developer profile, relationship owner, agreement type, permitted marketing rights,
  partnership status.
- Project profile: name, locality, map/location link, property type, launch/status, RERA registration
  details where applicable, amenities, possession estimate, approved collateral.
- Inventory records: unit/plot identifier, configuration/plot size, floor/orientation if applicable,
  indicative price, availability status, last verified date, notes.
- Lead-to-project matching using location, budget, property type and preferences; allow consultants to
  shortlist multiple options.
- Separate clearly between indicative pricing, verified inventory, builder-confirmed availability and
  unavailable/reserved inventory.
- Future exclusive mandates: record exclusivity scope, territory, validity dates, inventory
  allocation, commission terms and renewal/expiry reminders.

---

## 8. Marketing Dashboard

Consolidate campaign reporting from connected platforms and provide a controlled route to launch or
manage campaigns where APIs and account permissions permit.

**Channels in scope**
- Google Ads — campaign/ad group performance and conversion data via an authorised integration.
- Meta Ads — Facebook/Instagram campaign performance via an authorised integration.
- Email — campaign sends, delivery, opens/clicks where supported, bounces and unsubscribes.
- SMS — sent, delivered, failed and response metrics where the gateway exposes them.
- WhatsApp — template/message status and response events via an approved WhatsApp Business integration.

**Dashboard widgets and filters**
- Spend, impressions/reach, clicks, CTR, leads, CPL, qualified leads, cost per qualified lead, site
  visits, bookings and ROAS where measurable.
- Date range, channel, campaign, project, property type, geography, lead owner and attribution/source
  filters.
- Trend charts, channel comparison, campaign ranking, funnel drop-off and budget-versus-outcome views.
- Lead-level drill-down from a campaign metric to attributable records, subject to permissions.
- UTM capture and source preservation from landing page/form through lead, site visit and booking.

> **Campaign execution boundary:** the first release may prioritise read/reporting integrations and
> campaign metadata. Direct campaign creation, editing, pausing or budget changes should only be
> enabled for platforms whose APIs, approvals, account permissions and product scope support those
> actions. Display a clear connected/not-connected state and last-sync timestamp.

---

## 9. Automation / Workflow Engine

Allow an authorised user to define a trigger, conditions, actions, delays and exit rules **without
writing code**.

**Trigger examples**
- Lead created/imported; lead assigned or reassigned; no response after a defined period.
- Lead qualifies, changes stage, selects a project, books/completes a site visit, enters negotiation,
  books or is marked lost.
- A task becomes overdue; a project/inventory status changes; a campaign lead arrives with a matching
  UTM/source.

**Action examples**
- Assign by round-robin, territory/area, property type, team, partner tier, workload or lead score;
  allow manual override with audit trail.
- Create task, set due date, notify owner/manager, add tag, update field, enrol in or remove from a
  sequence.
- Send approved WhatsApp template, SMS or email; send internal alert; create escalation if SLA missed.
- Branch based on response, lead stage, consent, preferred channel, budget or other conditions.

**Drip sequence capabilities**
- Multiple steps with configurable delays and business-hour windows.
- Channel fallback rules only where consent and provider rules permit.
- Stop conditions: reply received, opt-out, booking, stage change, owner cancellation, manual removal.
- Retry and failure handling, message/template status, workflow run history and a safe test mode.
- Per-lead history showing which rule ran, why it ran, messages/tasks created and any error.

**Safety controls**
- Consent and opt-out checked immediately before outbound messages, not only at enrollment.
- Prevent duplicate enrollment and repeated messages from the same event.
- Rate limits, quiet hours, retry limits and a global pause switch per workflow.
- Approval process for publishing workflows that send external communications.

---

## 10. Tasks, Communication and Site Visits

- Unified task list with due/overdue, priority, owner, lead/project, task type and outcome.
- Call notes and disposition codes; next follow-up date required for active leads unless explicitly
  exempted.
- Site visit calendar with scheduled/completed/cancelled/no-show status, project location and
  post-visit outcome.
- Templates for email, SMS and WhatsApp with approved variables and preview before sending.
- Communication timeline distinguishes sent, delivered, failed, replied and manually logged events
  where the provider supports those statuses.

---

## 11. Reports and Analytics

| Report | Core breakdowns |
|---|---|
| Lead acquisition | Source, campaign, channel, UTM, project, area, property type, date. |
| Sales funnel | Stage counts, stage conversion, ageing and drop-off reasons. |
| Team performance | Assigned leads, first-response time, activity completion, qualified leads, visits, bookings. |
| Project performance | Enquiries, qualified leads, visits, negotiations, bookings and inventory interest. |
| Campaign efficiency | Spend, CPL, qualified-lead cost, visit cost, booking/revenue efficiency where available. |
| Data quality | Duplicates, missing fields, invalid contacts, consent status and import errors. |
| Automation health | Runs, successes, failures, skipped actions, message delivery and workflow conversion. |

Reports should support date filters and CSV export subject to permissions. Metric definitions and
attribution windows must be documented to avoid conflicting numbers between platforms and CRM.

---

## 12. Integrations and Technical Considerations

| Integration | Purpose / considerations |
|---|---|
| Google Ads API | Campaign performance and conversion reporting; direct campaign ops subject to API access/permissions. |
| Meta Marketing API | Facebook/Instagram ads reporting and approved campaign operations. |
| Landing pages / web forms | Lead capture, hidden UTM fields, consent capture, duplicate prevention, source attribution. |
| WhatsApp Business Platform/provider | Template messaging, status webhooks and replies; approved templates and consent controls required. |
| SMS gateway | Transactional/promotional messaging, delivery reports and provider-specific opt-out handling. |
| Email provider / SMTP | Campaign sends and events (bounces, opens/clicks where available); unsubscribe support. |
| Calendar | Site visits, meetings and reminders; integration can be deferred from MVP if needed. |
| Cloud database and file storage | Secure lead, project, activity, campaign and import storage; protect uploaded datasets and collateral. |

**Architecture guidance (not a final mandated stack)**
- Responsive web application with API-backed services and a relational database for structured CRM data.
- Background job queue for imports, scheduled syncs, bulk operations and workflow execution.
- Webhook receiver for messaging and supported platform events; idempotency to avoid duplicate processing.
- Central integration layer with token/credential management, sync logs, retry policies, provider error visibility.
- Environment separation for development, staging and production; secrets stored outside source code.

---

## 13. Non-Functional Requirements

- **Security:** authenticated access, role/record permissions, secure secrets, encryption in transit,
  appropriate encryption at rest, audit logs and secure backups.
- **Privacy:** collect only necessary personal data; document purpose and consent; support correction,
  suppression and deletion workflows where legally required.
- **Reliability:** background jobs retry safely; failures are visible; no silent loss of imported leads
  or provider events.
- **Performance:** normal list and detail views responsive on realistic initial volumes; bulk
  operations run asynchronously.
- **Usability:** responsive desktop/tablet/mobile layouts, searchable lists, saved filters, clear
  empty/error states and confirmation for risky actions.
- **Maintainability:** configurable stages, fields, assignment rules, templates and workflow conditions
  without code changes where practical.
- **Auditability:** record who changed assignment, stage, consent, inventory availability, campaign
  settings and exports.

---

## 14. MVP Scope vs Later Releases

| Release | Recommended scope |
|---|---|
| MVP / First cut | Login and roles; overview; lead/contact records; CSV/XLSX import and dedupe; assignment; pipeline; tasks/follow-ups; project directory; basic source/UTM capture; dashboard with manually uploaded or first connected campaign reports; basic email/WhatsApp/SMS integration only if credentials and provider setup are ready. |
| Release 2 | Automated Google/Meta reporting sync; workflow builder; drip campaigns; richer funnel attribution; team dashboards; site visit calendar; approval and message-delivery logs. |
| Release 3 | Campaign create/manage actions where APIs permit; partner/referral portal; builder inventory and exclusive mandate tracking; advanced scoring and budget optimisation. |
| Future expansion | Dubai/international projects, NRI investor segmentation, multi-currency display, international partner permissions and jurisdiction-specific compliance review. |

---

## 15. Key User Stories

- As an **operations user**, I can upload a spreadsheet, map columns and review duplicates before
  importing leads.
- As a **manager**, I can see unassigned and ageing leads and assign them using a rule or manual
  selection.
- As a **consultant**, I can see all activity for a lead, log a call, schedule the next action and
  update the pipeline stage.
- As a **marketing user**, I can compare campaign spend and lead outcomes by channel, campaign and
  project.
- As a **workflow administrator**, I can trigger a follow-up sequence when a lead is created and stop
  it when the lead replies or opts out.
- As an **owner**, I can compare team, source and project performance without giving every user
  unrestricted access to all data.

---

## 16. MVP Acceptance Checklist

- Users can sign in and see only permitted modules and records.
- Lead records can be created manually and imported from a mapped CSV/XLSX file.
- Duplicate candidates are flagged and import results are downloadable.
- Lead source, campaign and UTM values remain attached through pipeline stages.
- Users can assign leads, log activity, set next actions and move leads through configurable stages.
- Projects can be created and linked to leads; inventory status includes a last-verified date.
- Dashboard figures reconcile to documented filters and metric definitions.
- Connected integrations display connection status, last successful sync and visible errors.
- Workflow tests show the intended actions and stop conditions before publication.
- Consent and opt-out controls prevent prohibited outbound campaign enrollment and sends.
- Exports and sensitive changes are permission-controlled and auditable.

---

## 17. Open Decisions Before Development

| Decision | Why it matters |
|---|---|
| Initial user count and expected lead volume | Affects hosting, indexing, import strategy and performance testing. |
| Existing lead sources and file formats | Defines import templates and integration priorities. |
| CRM standalone or syncs with an existing CRM | Avoids duplicated systems and clarifies ownership of lead records. |
| Which ad and messaging accounts are available | Confirm API access, permissions, approval steps and realistic first-cut scope. |
| WhatsApp/SMS/email provider choice | Determines template, delivery, opt-out and event capabilities. |
| Lead assignment rules and SLA targets | Needed to configure workflows and reporting. |
| Pipeline stages and lost reasons | Must reflect the actual sales process. |
| Project/inventory data source | Determines manual entry, bulk upload or builder feed integration. |
| Data retention, privacy and user permissions | Needed for implementation and operational governance. |
| Brand/product name | Can be finalised independently; CRM can initially use a working product name. |

---

## 18. Implementation Guidance for the Technology Partner

- Start with clickable wireframes for Overview, Raw/Bulk Data, Lead Detail, Marketing Dashboard and
  Automation Builder.
- Agree data model and permission matrix before building integrations.
- Deliver an end-to-end vertical slice: import a lead → assign owner → log activity → link project →
  create follow-up task → report source.
- Use mocked/sample campaign data for early UI demos; replace with real integrations only after
  credentials and API access are validated.
- Keep integrations modular so the business can launch the core CRM before all channel connectors are
  complete.
- Provide source code, environment setup instructions, deployment steps, database schema/migrations,
  test cases and an admin handover.

---

## Appendix A — Core Data Entities

| Entity | Key relationships / fields |
|---|---|
| User / Team | Role, team, territory, active status, permissions. |
| Lead / Contact | Contact details, preferences, consent, source, owner, score, status. |
| Activity | Lead, user, type, timestamp, outcome, notes, next action. |
| Project / Builder | Project profile, developer, partnership status, approved assets. |
| Inventory Item | Project, unit/plot identifier, price, status, last verified date. |
| Campaign / Touchpoint | Channel, platform IDs, spend/performance metrics, UTM/source, date range. |
| Workflow / Run | Trigger, conditions, actions, schedule, status, execution log. |
| Message / Template | Channel, provider ID, template, delivery status, consent check. |
| Task / Site Visit | Owner, lead, project, due date, outcome, reminders. |
| Audit Event | Actor, action, entity, timestamp, before/after metadata where appropriate. |

> **Document status:** Draft requirements baseline. Treat provider-specific API capability, campaign
> write access, privacy obligations, messaging permissions and local regulatory requirements as
> implementation-validation items.
