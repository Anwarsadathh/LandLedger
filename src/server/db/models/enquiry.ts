import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";
import { LEAD_STATUSES } from "@/server/domain/enums";

// Buyer enquiry = top of the lead/CRM pipeline (handover spec §5, §16).
// Captures consent + source attribution and a dedupe key from day one.
const EnquirySchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: String,
    message: { type: String, maxlength: 2000 },

    consent: {
      accepted: { type: Boolean, required: true },
      noticeVersion: { type: String, required: true },
      text: String,
    },

    source: {
      channel: { type: String, default: "WEB" },
      campaign: String,
      utmSource: String,
      utmMedium: String,
      utmCampaign: String,
    },

    status: { type: String, enum: LEAD_STATUSES, default: "NEW", index: true },
    assignedToId: String,

    // Normalised phone+listing used to detect duplicates (spec §16).
    dedupeKey: { type: String, index: true },
  },
  { timestamps: true },
);

export type EnquiryDoc = InferSchemaType<typeof EnquirySchema>;

export const Enquiry: Model<EnquiryDoc> =
  (mongoose.models.Enquiry as Model<EnquiryDoc>) ||
  mongoose.model<EnquiryDoc>("Enquiry", EnquirySchema);
