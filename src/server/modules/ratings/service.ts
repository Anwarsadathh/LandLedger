import { connectToDatabase } from "@/server/db/connect";
import { Rating } from "@/server/db/models/rating";
import { Listing } from "@/server/db/models/listing";
import { ApiError } from "@/lib/http";
import { listingExistsAndPublished } from "@/server/modules/listings/service";
import { normalizePhone } from "@/server/modules/enquiries/service";
import type { CreateRatingInput } from "./schema";

export type OwnerRating = { average: number | null; count: number };

async function aggregateForOwner(ownerId: string): Promise<OwnerRating> {
  const agg = await Rating.aggregate<{ avg: number; n: number }>([
    { $match: { ownerId } },
    { $group: { _id: null, avg: { $avg: "$stars" }, n: { $sum: 1 } } },
  ]);
  if (!agg[0]) return { average: null, count: 0 };
  return { average: Math.round(agg[0].avg * 10) / 10, count: agg[0].n };
}

/** Submit (or update) a rating for the owner of a listing. Returns the owner's
 *  recomputed aggregate. Deduped per (owner, rater phone). */
export async function submitRating(
  listingId: string,
  input: CreateRatingInput,
): Promise<OwnerRating> {
  const listing = await listingExistsAndPublished(listingId);
  if (!listing) {
    throw new ApiError("NOT_FOUND", "Listing not found or not published.", 404);
  }
  await connectToDatabase();

  const ownerId = listing.createdById;
  const raterPhone = normalizePhone(input.phone);

  await Rating.findOneAndUpdate(
    { ownerId, raterPhone },
    { $set: { stars: input.stars, listingId, ...(input.comment ? { comment: input.comment } : {}) } },
    { upsert: true, new: true },
  );

  return aggregateForOwner(ownerId);
}

/** The owner's aggregate rating for a published listing (no PII). Returns a
 *  zero aggregate rather than throwing when the slug is missing. */
export async function getOwnerRatingForSlug(slug: string): Promise<OwnerRating> {
  await connectToDatabase();
  const listing = await Listing.findOne(
    { publicSlug: slug, workflowStatus: "PUBLISHED" },
    { createdById: 1 },
  ).lean<{ createdById: string } | null>();
  if (!listing) return { average: null, count: 0 };
  return aggregateForOwner(listing.createdById);
}
