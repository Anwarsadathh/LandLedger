import { connectToDatabase } from "@/server/db/connect";
import { Enquiry } from "@/server/db/models/enquiry";
import { ApiError } from "@/lib/http";
import { recordAudit } from "@/server/modules/audit/service";
import { listingExistsAndPublished } from "@/server/modules/listings/service";
import type { CreateEnquiryInput } from "./schema";

/** India-oriented phone normalisation: digits only, keep the last 10. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function createEnquiry(listingId: string, input: CreateEnquiryInput) {
  const listing = await listingExistsAndPublished(listingId);
  if (!listing) {
    throw new ApiError("NOT_FOUND", "Listing not found or not published.", 404);
  }

  await connectToDatabase();
  const dedupeKey = `${listingId}:${normalizePhone(input.phone)}`;

  // Enquiry-gated owner contact (spec §8): the owner's details are revealed to
  // the enquirer only once they submit a consented enquiry. Safe here — not in
  // the public listing API.
  const contact = listing.ownerContact?.phone
    ? { name: listing.ownerContact.name ?? null, phone: listing.ownerContact.phone }
    : null;

  // Duplicate handling (spec §16): do not silently create a second identical
  // lead for the same phone + listing. Return the existing one instead.
  const existing = await Enquiry.findOne({ dedupeKey });
  if (existing) {
    await recordAudit({
      actorId: "public",
      actorRole: "PUBLIC",
      action: "ENQUIRY_DUPLICATE",
      entityType: "Enquiry",
      entityId: String(existing._id),
      metadata: { listingId },
    });
    return { id: String(existing._id), status: existing.status, duplicate: true, contact };
  }

  const doc = await Enquiry.create({
    listingId,
    name: input.name,
    phone: input.phone,
    email: input.email || undefined,
    message: input.message,
    consent: input.consent,
    source: input.source ?? { channel: "WEB" },
    status: "NEW",
    dedupeKey,
  });

  await recordAudit({
    actorId: "public",
    actorRole: "PUBLIC",
    action: "ENQUIRY_CREATED",
    entityType: "Enquiry",
    entityId: String(doc._id),
    metadata: { listingId, source: doc.source },
  });

  return { id: String(doc._id), status: doc.status, duplicate: false, contact };
}
