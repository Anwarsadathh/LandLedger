import { z } from "zod";
import {
  AREA_UNITS,
  CONTENT_LANGUAGES,
  FACINGS,
  LISTING_TYPES,
  PIN_PRECISIONS,
  PRICE_BASES,
  ROAD_ACCESS,
  SUBMITTER_ROLES,
  TRANSACTION_TYPES,
} from "@/server/domain/enums";

const priceSchema = z
  .object({
    min: z.number().int("Price must be a whole number").nonnegative(),
    max: z.number().int().nonnegative().optional(),
    currency: z.string().default("INR"),
    basis: z.enum(PRICE_BASES).default("TOTAL"),
    negotiable: z.boolean().default(true),
  })
  .refine((p) => p.max === undefined || p.max >= p.min, {
    message: "Max price must be greater than or equal to min price",
    path: ["max"],
  });

const locationSchema = z.object({
  state: z.string().min(2), // e.g. IN-BR, IN-KA
  district: z.string().min(1),
  subDistrict: z.string().optional(),
  locality: z.string().optional(),
  addressText: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  pinPrecision: z.enum(PIN_PRECISIONS).default("USER_DROPPED_PIN"),
});

export const createListingSchema = z.object({
  listingType: z.enum(LISTING_TYPES),
  assetSubtype: z.string().max(60).optional(),
  transactionType: z.enum(TRANSACTION_TYPES),
  title: z.string().min(4).max(160),
  description: z.string().max(5000).optional(),
  contentLanguage: z.enum(CONTENT_LANGUAGES).default("EN"),
  price: priceSchema,
  area: z.object({
    value: z.number().positive(),
    unit: z.enum(AREA_UNITS),
  }),
  location: locationSchema,
  features: z
    .object({
      roadAccess: z.enum(ROAD_ACCESS).default("UNKNOWN"),
      roadWidth: z.string().optional(),
      frontage: z.string().optional(),
      facing: z.enum(FACINGS).default("UNKNOWN"),
      landUseClaim: z.string().optional(),
      utilities: z.array(z.string()).optional(),
      possessionStatus: z.string().optional(),
      nearbyLandmarks: z.string().optional(),
    })
    .optional(),
  landIdentifiers: z
    .array(
      z.object({
        identifierType: z.string().min(1),
        identifierValue: z.string().min(1),
      }),
    )
    .optional(),
  media: z
    .array(
      z.object({
        type: z.enum(["PHOTO", "VIDEO"]).default("PHOTO"),
        url: z.string().url(),
      }),
    )
    .optional(),
  ownerContact: z.object({
    name: z.string().optional(),
    phone: z.string().min(6),
    email: z.string().email().optional(),
  }),
  submitterRole: z.enum(SUBMITTER_ROLES),
  authorityDeclarationAccepted: z.literal(true, {
    message: "You must confirm you are authorised to list this property",
  }),
  contactConsent: z.object({
    accepted: z.literal(true, { message: "Contact consent is required" }),
    noticeVersion: z.string().min(1),
  }),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const moderationDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "PUBLISH", "REQUEST_CORRECTION", "REJECT", "PAUSE", "UNPAUSE"]),
  reason: z.string().max(1000).optional(),
});

export type ModerationDecisionInput = z.infer<typeof moderationDecisionSchema>;

// Editable fields only — status, ownership, consent and declarations are not
// changed here (status moves through moderation actions).
export const updateListingSchema = createListingSchema.pick({
  title: true,
  description: true,
  contentLanguage: true,
  price: true,
  area: true,
  location: true,
  features: true,
  media: true,
});

export type UpdateListingInput = z.infer<typeof updateListingSchema>;
