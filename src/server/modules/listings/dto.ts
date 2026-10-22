import type { ListingDoc } from "@/server/db/models/listing";
import type { HydratedDocument } from "mongoose";

/**
 * Public-facing listing shape. Deliberately EXCLUDES ownerContact, consent,
 * land identifiers, creator ids and review history — none of these may appear
 * in a public API response (handover spec §14).
 */
export type PublicListing = ReturnType<typeof toPublicListing>;

export function toPublicListing(doc: HydratedDocument<ListingDoc>) {
  return {
    id: String(doc._id),
    slug: doc.publicSlug,
    listingType: doc.listingType,
    assetSubtype: doc.assetSubtype ?? null,
    transactionType: doc.transactionType,
    title: doc.title,
    description: doc.description ?? null,
    contentLanguage: (doc.contentLanguage as string) ?? "EN",
    price: {
      min: doc.price.min,
      max: doc.price.max ?? null,
      currency: doc.price.currency,
      basis: doc.price.basis,
      negotiable: doc.price.negotiable,
    },
    area: {
      value: doc.area.value,
      unit: doc.area.unit,
      normalizedSqFt: doc.area.normalizedSqFt ?? null,
    },
    location: {
      state: doc.location.state,
      district: doc.location.district,
      subDistrict: doc.location.subDistrict ?? null,
      locality: doc.location.locality ?? null,
      latitude: doc.location.latitude,
      longitude: doc.location.longitude,
      pinPrecision: doc.location.pinPrecision,
    },
    features: doc.features ?? null,
    media: (doc.media ?? []).map((m) => ({
      type: m.type,
      url: m.url,
      aiGeneratedOrEnhanced: m.aiGeneratedOrEnhanced,
    })),
    status: doc.workflowStatus, // always PUBLISHED for public results
    publishedAt: doc.publishedAt ?? null,
  };
}

/**
 * Internal/admin shape — includes review history and private owner contact.
 * Only returned to permitted roles.
 */
export function toAdminListing(doc: HydratedDocument<ListingDoc>) {
  return {
    ...toPublicListing(doc),
    addressText: doc.location.addressText ?? null,
    ownerContact: doc.ownerContact,
    submitterRole: doc.submitterRole,
    landIdentifiers: doc.landIdentifiers ?? [],
    createdById: doc.createdById,
    createdByRole: doc.createdByRole,
    reviewHistory: doc.reviewHistory ?? [],
    createdAt: (doc as unknown as { createdAt?: Date }).createdAt ?? null,
    updatedAt: (doc as unknown as { updatedAt?: Date }).updatedAt ?? null,
  };
}
