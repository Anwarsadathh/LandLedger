import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";
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
  WORKFLOW_STATUSES,
} from "@/server/domain/enums";

// GeoJSON point — indexed with 2dsphere so Mongo can answer radius / bounds
// searches (handover spec §4: geospatial point/polygon queries).
const PointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    // GeoJSON order is [longitude, latitude].
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const LocationSchema = new Schema(
  {
    state: { type: String, required: true }, // e.g. "IN-BR", "IN-KA"
    district: { type: String, required: true },
    subDistrict: String, // circle / anchal / tehsil / taluk
    locality: String, // village / mouza / locality
    addressText: String,
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    pinPrecision: { type: String, enum: PIN_PRECISIONS, default: "USER_DROPPED_PIN" },
    geo: { type: PointSchema, required: true },
  },
  { _id: false },
);

const PriceSchema = new Schema(
  {
    // Whole-INR integers (no paise) — never floating point (spec §5).
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, default: "INR" },
    basis: { type: String, enum: PRICE_BASES, default: "TOTAL" },
    negotiable: { type: Boolean, default: true },
  },
  { _id: false },
);

const AreaSchema = new Schema(
  {
    value: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: AREA_UNITS, required: true },
    // Normalized conversion kept alongside the local unit (spec §5/§6.1).
    normalizedSqFt: Number,
  },
  { _id: false },
);

const LandIdentifierSchema = new Schema(
  {
    identifierType: { type: String, required: true }, // khata, khesra, survey_no, ...
    identifierValue: { type: String, required: true },
    stateMeta: Schema.Types.Mixed,
    enteredBy: String,
    verifiedStatus: { type: String, default: "NOT_VERIFIED" },
  },
  { _id: false },
);

const MediaSchema = new Schema(
  {
    type: { type: String, enum: ["PHOTO", "VIDEO"], default: "PHOTO" },
    url: { type: String, required: true },
    uploadedBy: String,
    aiGeneratedOrEnhanced: { type: Boolean, default: false },
    provenance: String,
  },
  { _id: false },
);

const ReviewEventSchema = new Schema(
  {
    from: { type: String, enum: WORKFLOW_STATUSES },
    to: { type: String, enum: WORKFLOW_STATUSES, required: true },
    actorId: String,
    actorRole: String,
    reason: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ListingSchema = new Schema(
  {
    publicSlug: { type: String, unique: true, sparse: true },
    listingType: { type: String, enum: LISTING_TYPES, required: true },
    // Finer, human-facing subtype label (e.g. "Flat / Apartment", "Agricultural
    // Land"). Free text so the UI can offer rich options without bloating the
    // coarse listingType enum.
    assetSubtype: { type: String },
    transactionType: { type: String, enum: TRANSACTION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, maxlength: 5000 },
    // Language the title/description are written in (owner-typed, never translated).
    contentLanguage: { type: String, enum: CONTENT_LANGUAGES, default: "EN" },

    price: { type: PriceSchema, required: true },
    area: { type: AreaSchema, required: true },
    location: { type: LocationSchema, required: true },

    features: {
      roadAccess: { type: String, enum: ROAD_ACCESS, default: "UNKNOWN" },
      roadWidth: String,
      frontage: String,
      facing: { type: String, enum: FACINGS, default: "UNKNOWN" },
      landUseClaim: String,
      utilities: [String],
      possessionStatus: String,
      nearbyLandmarks: String,
    },

    landIdentifiers: { type: [LandIdentifierSchema], default: [] },
    media: { type: [MediaSchema], default: [] },

    // Private — never exposed via public API.
    ownerContact: {
      name: String,
      phone: { type: String, required: true },
      email: String,
    },
    submitterRole: { type: String, enum: SUBMITTER_ROLES, required: true },
    authorityDeclarationAccepted: { type: Boolean, required: true },
    contactConsent: {
      accepted: { type: Boolean, required: true },
      noticeVersion: { type: String, required: true },
      acceptedAt: { type: Date, default: Date.now },
    },

    createdById: { type: String, required: true },
    createdByRole: { type: String, required: true },

    workflowStatus: {
      type: String,
      enum: WORKFLOW_STATUSES,
      default: "DRAFT",
      index: true,
    },
    reviewHistory: { type: [ReviewEventSchema], default: [] },
    publishedAt: Date,
  },
  { timestamps: true },
);

ListingSchema.index({ "location.geo": "2dsphere" });
ListingSchema.index({ title: "text", description: "text" });

export type ListingDoc = InferSchemaType<typeof ListingSchema>;

export const Listing: Model<ListingDoc> =
  (mongoose.models.Listing as Model<ListingDoc>) ||
  mongoose.model<ListingDoc>("Listing", ListingSchema);
