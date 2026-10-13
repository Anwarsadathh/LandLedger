// Domain enums shared by models, validation schemas and services.
// Kept framework-agnostic so they survive a later extraction to a NestJS service.

export const LISTING_TYPES = [
  "LAND_PLOT",
  "RESIDENTIAL",
  "COMMERCIAL",
  "AGRICULTURAL",
  "INDUSTRIAL",
  "PROJECT_INVENTORY",
] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const TRANSACTION_TYPES = ["SALE", "LEASE"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PRICE_BASES = ["TOTAL", "PER_UNIT"] as const;
export type PriceBasis = (typeof PRICE_BASES)[number];

// Local units vary by district; conversions are configurable (handover spec §6.1).
export const AREA_UNITS = [
  "SQ_FT",
  "SQ_YD",
  "SQ_M",
  "ACRE",
  "HECTARE",
  "DECIMAL",
  "KATHA",
  "BIGHA",
] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

export const PIN_PRECISIONS = [
  "USER_DROPPED_PIN",
  "ROOFTOP",
  "APPROXIMATE",
  "UNKNOWN",
] as const;
export type PinPrecision = (typeof PIN_PRECISIONS)[number];

export const FACINGS = [
  "NORTH",
  "SOUTH",
  "EAST",
  "WEST",
  "NORTH_EAST",
  "NORTH_WEST",
  "SOUTH_EAST",
  "SOUTH_WEST",
  "UNKNOWN",
] as const;
export type Facing = (typeof FACINGS)[number];

export const ROAD_ACCESS = ["YES", "NO", "UNKNOWN"] as const;
export type RoadAccess = (typeof ROAD_ACCESS)[number];

/**
 * Publication workflow (handover spec §7). Phase 1 implements the publication
 * lifecycle only; document / record / field / legal review states are deferred
 * to Phase 3 and tracked separately from this status.
 */
export const WORKFLOW_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "NEEDS_CORRECTION",
  "APPROVED_TO_PUBLISH",
  "PUBLISHED",
  "PAUSED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const SUBMITTER_ROLES = ["OWNER", "AUTHORISED_REP", "BROKER"] as const;
export type SubmitterRole = (typeof SUBMITTER_ROLES)[number];

// Enquiry / lead pipeline (handover spec §16) — baseline stages.
export const LEAD_STATUSES = [
  "NEW",
  "ATTEMPTING_CONTACT",
  "CONTACTED",
  "QUALIFIED",
  "NURTURE",
  "SITE_VISIT_BOOKED",
  "SITE_VISIT_DONE",
  "NEGOTIATION",
  "WON",
  "LOST",
  "DISQUALIFIED",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
