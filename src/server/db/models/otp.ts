import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";

// One pending OTP challenge per phone number. The code is stored only as a hash;
// a TTL index auto-deletes expired challenges.
const OtpChallengeSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true }, // E.164, e.g. +9198...
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

OtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type OtpChallengeDoc = InferSchemaType<typeof OtpChallengeSchema>;

export const OtpChallenge: Model<OtpChallengeDoc> =
  (mongoose.models.OtpChallenge as Model<OtpChallengeDoc>) ||
  mongoose.model<OtpChallengeDoc>("OtpChallenge", OtpChallengeSchema);
