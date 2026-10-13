import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";

// Immutable audit trail (handover spec §3, §14): every action that changes
// public status, grants access, shares a lead or touches sensitive data writes
// one of these. Append-only by convention — never update or delete.
const AuditEventSchema = new Schema(
  {
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true }, // e.g. LISTING_PUBLISHED
    entityType: { type: String, required: true }, // e.g. Listing, Enquiry
    entityId: { type: String, required: true, index: true },
    metadata: Schema.Types.Mixed,
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

export type AuditEventDoc = InferSchemaType<typeof AuditEventSchema>;

export const AuditEvent: Model<AuditEventDoc> =
  (mongoose.models.AuditEvent as Model<AuditEventDoc>) ||
  mongoose.model<AuditEventDoc>("AuditEvent", AuditEventSchema);
