import { Types } from "mongoose";
import { connectToDatabase } from "@/server/db/connect";
import { Listing, type ListingDoc } from "@/server/db/models/listing";
import { Enquiry } from "@/server/db/models/enquiry";
import { ApiError } from "@/lib/http";
import { makeSlug } from "@/lib/slug";
import { recordAudit } from "@/server/modules/audit/service";
import {
  MODERATOR_ROLES,
  SUBMITTER_ROLES as SUBMITTER_ALLOWED,
  hasRole,
} from "@/server/auth/roles";
import type { CurrentUser } from "@/server/auth/current-user";
import type { WorkflowStatus } from "@/server/domain/enums";
import { toAdminListing, toPublicListing } from "./dto";
import type {
  CreateListingInput,
  ModerationDecisionInput,
  UpdateListingInput,
} from "./schema";

function requireModerator(user: CurrentUser) {
  if (!hasRole(user.role, MODERATOR_ROLES)) {
    throw new ApiError("FORBIDDEN", "Admin / reviewer access required.", 403);
  }
}

// Area unit → square feet. Only unambiguous units are converted. KATHA / BIGHA
// vary by district (spec §6.1) and must come from a per-district config, so we
// deliberately leave them unconverted rather than guess.
const SQ_FT_PER_UNIT: Partial<Record<string, number>> = {
  SQ_FT: 1,
  SQ_YD: 9,
  SQ_M: 10.7639,
  ACRE: 43560,
  HECTARE: 107639,
  DECIMAL: 435.6,
};

function areaToSqFt(value: number, unit: string): number | undefined {
  const factor = SQ_FT_PER_UNIT[unit];
  return factor ? Math.round(value * factor) : undefined;
}

// Allowed workflow transitions (handover spec §7). Publication status is kept
// separate from document / legal review status (not modelled in Phase 1).
const TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  NEEDS_CORRECTION: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["APPROVED_TO_PUBLISH", "NEEDS_CORRECTION", "REJECTED"],
  APPROVED_TO_PUBLISH: ["PUBLISHED", "NEEDS_CORRECTION", "REJECTED"],
  PUBLISHED: ["PAUSED", "WITHDRAWN"],
  PAUSED: ["PUBLISHED", "WITHDRAWN"],
  REJECTED: [],
  WITHDRAWN: [],
};

function assertTransition(from: WorkflowStatus, to: WorkflowStatus) {
  if (!TRANSITIONS[from].includes(to)) {
    throw new ApiError(
      "INVALID_TRANSITION",
      `Cannot move a listing from ${from} to ${to}.`,
      409,
    );
  }
}

async function loadListing(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError("NOT_FOUND", "Listing not found.", 404);
  }
  const doc = await Listing.findById(id);
  if (!doc) throw new ApiError("NOT_FOUND", "Listing not found.", 404);
  return doc;
}

export async function createDraft(input: CreateListingInput, user: CurrentUser) {
  if (!hasRole(user.role, SUBMITTER_ALLOWED)) {
    throw new ApiError("FORBIDDEN", "You are not allowed to create listings.", 403);
  }
  await connectToDatabase();

  const doc = await Listing.create({
    ...input,
    area: {
      ...input.area,
      normalizedSqFt: areaToSqFt(input.area.value, input.area.unit),
    },
    location: {
      ...input.location,
      geo: {
        type: "Point",
        coordinates: [input.location.longitude, input.location.latitude],
      },
    },
    contactConsent: { ...input.contactConsent, acceptedAt: new Date() },
    createdById: user.id,
    createdByRole: user.role,
    workflowStatus: "DRAFT",
    reviewHistory: [{ to: "DRAFT", actorId: user.id, actorRole: user.role, at: new Date() }],
  });

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "LISTING_CREATED",
    entityType: "Listing",
    entityId: String(doc._id),
  });

  return toAdminListing(doc);
}

export async function submitForReview(id: string, user: CurrentUser) {
  await connectToDatabase();
  const doc = await loadListing(id);

  // Record-level ownership: only the creator (or staff) can submit.
  if (doc.createdById !== user.id && !hasRole(user.role, MODERATOR_ROLES)) {
    throw new ApiError("FORBIDDEN", "You can only submit your own listing.", 403);
  }

  const from = doc.workflowStatus as WorkflowStatus;
  assertTransition(from, "SUBMITTED");
  doc.workflowStatus = "SUBMITTED";
  doc.reviewHistory.push({ from, to: "SUBMITTED", actorId: user.id, actorRole: user.role, at: new Date() });
  await doc.save();

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "LISTING_SUBMITTED",
    entityType: "Listing",
    entityId: id,
  });

  return toAdminListing(doc);
}

export async function moderate(
  id: string,
  input: ModerationDecisionInput,
  user: CurrentUser,
) {
  if (!hasRole(user.role, MODERATOR_ROLES)) {
    throw new ApiError("FORBIDDEN", "Only reviewers/admins can moderate listings.", 403);
  }
  await connectToDatabase();
  const doc = await loadListing(id);
  const from = doc.workflowStatus as WorkflowStatus;

  const target: Record<ModerationDecisionInput["decision"], WorkflowStatus> = {
    APPROVE: "APPROVED_TO_PUBLISH",
    PUBLISH: "PUBLISHED",
    REQUEST_CORRECTION: "NEEDS_CORRECTION",
    REJECT: "REJECTED",
    PAUSE: "PAUSED",
    UNPAUSE: "PUBLISHED",
  };
  const to = target[input.decision];

  if ((to === "NEEDS_CORRECTION" || to === "REJECTED") && !input.reason?.trim()) {
    throw new ApiError("REASON_REQUIRED", "A reason is required for this decision.", 422);
  }

  assertTransition(from, to);
  doc.workflowStatus = to;

  if (to === "PUBLISHED") {
    doc.publishedAt = new Date();
    if (!doc.publicSlug) doc.publicSlug = makeSlug(doc.title);
  }

  doc.reviewHistory.push({
    from,
    to,
    actorId: user.id,
    actorRole: user.role,
    reason: input.reason,
    at: new Date(),
  });
  await doc.save();

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: `LISTING_${input.decision}`,
    entityType: "Listing",
    entityId: id,
    metadata: { from, to, reason: input.reason },
  });

  return toAdminListing(doc);
}

export type PublicSearchFilters = {
  state?: string;
  city?: string;
  listingType?: string;
  priceMin?: number;
  priceMax?: number;
  q?: string;
  near?: { lng: number; lat: number; radiusKm: number };
  limit?: number;
  cursor?: string; // _id to page after
};

export async function searchPublicListings(filters: PublicSearchFilters) {
  await connectToDatabase();
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);

  const query: Record<string, unknown> = { workflowStatus: "PUBLISHED" };
  if (filters.state) query["location.state"] = filters.state;
  if (filters.city) query["location.district"] = filters.city;
  if (filters.listingType) query.listingType = filters.listingType;
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    query["price.min"] = {
      ...(filters.priceMin !== undefined ? { $gte: filters.priceMin } : {}),
      ...(filters.priceMax !== undefined ? { $lte: filters.priceMax } : {}),
    };
  }
  if (filters.q) query.$text = { $search: filters.q };
  if (filters.near) {
    query["location.geo"] = {
      $near: {
        $geometry: { type: "Point", coordinates: [filters.near.lng, filters.near.lat] },
        $maxDistance: filters.near.radiusKm * 1000,
      },
    };
  }
  // Cursor paging by _id (descending). $near already sorts by distance, so we
  // only apply the id cursor when not doing a geo search.
  if (filters.cursor && !filters.near && Types.ObjectId.isValid(filters.cursor)) {
    query._id = { $lt: new Types.ObjectId(filters.cursor) };
  }

  const sort: Record<string, 1 | -1> = filters.near ? {} : { _id: -1 };
  const docs = await Listing.find(query).sort(sort).limit(limit + 1);

  const hasMore = docs.length > limit;
  const page = docs.slice(0, limit);
  return {
    items: page.map(toPublicListing),
    nextCursor: hasMore && !filters.near ? String(page[page.length - 1]._id) : null,
  };
}

export async function getPublicListingBySlug(slug: string) {
  await connectToDatabase();
  const doc = await Listing.findOne({ publicSlug: slug, workflowStatus: "PUBLISHED" });
  if (!doc) throw new ApiError("NOT_FOUND", "Listing not found.", 404);
  return toPublicListing(doc);
}

export async function getReviewQueue(user: CurrentUser) {
  if (!hasRole(user.role, MODERATOR_ROLES)) {
    throw new ApiError("FORBIDDEN", "Only reviewers/admins can see the review queue.", 403);
  }
  await connectToDatabase();
  const docs = await Listing.find({
    workflowStatus: { $in: ["SUBMITTED", "APPROVED_TO_PUBLISH", "NEEDS_CORRECTION"] },
  }).sort({ updatedAt: 1 });
  return docs.map(toAdminListing);
}

/** A single owner's own listings (all statuses). Record-level isolation. */
export async function listMine(userId: string) {
  await connectToDatabase();
  const docs = await Listing.find({ createdById: userId }).sort({ updatedAt: -1 });
  return docs.map(toAdminListing);
}

/** All listings for the admin dashboard, optionally filtered by status. */
export async function listAllForAdmin(user: CurrentUser, filters: { status?: string } = {}) {
  requireModerator(user);
  await connectToDatabase();
  const q: Record<string, unknown> = {};
  if (filters.status) q.workflowStatus = filters.status;
  const docs = await Listing.find(q).sort({ updatedAt: -1 }).limit(200);
  return docs.map(toAdminListing);
}

/** One listing (full admin view) by id. */
export async function getListingForAdmin(id: string, user: CurrentUser) {
  requireModerator(user);
  await connectToDatabase();
  const doc = await loadListing(id);
  return toAdminListing(doc);
}

/** Edit permitted fields. Allowed for moderators or the listing's own creator. */
export async function updateListing(id: string, input: UpdateListingInput, user: CurrentUser) {
  await connectToDatabase();
  const doc = await loadListing(id);
  if (doc.createdById !== user.id && !hasRole(user.role, MODERATOR_ROLES)) {
    throw new ApiError("FORBIDDEN", "You can only edit your own listing.", 403);
  }

  doc.title = input.title;
  doc.description = input.description;
  doc.contentLanguage = input.contentLanguage;
  doc.price = input.price;
  doc.area = { ...input.area, normalizedSqFt: areaToSqFt(input.area.value, input.area.unit) };
  doc.location = {
    ...input.location,
    geo: { type: "Point", coordinates: [input.location.longitude, input.location.latitude] },
  };
  // doc.set() avoids Mongoose's strict DocumentArray / nested-type assignment.
  if (input.features) doc.set("features", input.features);
  if (input.media) doc.set("media", input.media);
  await doc.save();

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "LISTING_EDITED",
    entityType: "Listing",
    entityId: id,
  });
  return toAdminListing(doc);
}

/** Permanently delete a listing (moderator only). */
export async function deleteListing(id: string, user: CurrentUser) {
  requireModerator(user);
  await connectToDatabase();
  const doc = await loadListing(id);
  const title = doc.title;
  await doc.deleteOne();
  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "LISTING_DELETED",
    entityType: "Listing",
    entityId: id,
    metadata: { title },
  });
  return { id, deleted: true as const };
}

/** Dashboard counts by status + total enquiries. */
export async function adminStats(user: CurrentUser) {
  requireModerator(user);
  await connectToDatabase();
  const [byStatus, enquiries] = await Promise.all([
    Listing.aggregate<{ _id: string; n: number }>([
      { $group: { _id: "$workflowStatus", n: { $sum: 1 } } },
    ]),
    Enquiry.countDocuments({}),
  ]);
  const counts: Record<string, number> = {};
  for (const row of byStatus) counts[row._id] = row.n;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const pending =
    (counts.SUBMITTED ?? 0) + (counts.APPROVED_TO_PUBLISH ?? 0) + (counts.NEEDS_CORRECTION ?? 0);
  return { total, counts, enquiries, pending };
}

export async function listingExistsAndPublished(id: string): Promise<ListingDoc | null> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(id)) return null;
  return Listing.findOne({ _id: id, workflowStatus: "PUBLISHED" }).lean<ListingDoc>();
}
