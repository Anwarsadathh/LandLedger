import mongoose, { Schema, type Model } from "mongoose";

// Period counters for the app-level OTP send cap (Layer A). One doc per period:
//   _id "d:2026-10-19" (daily)  /  "m:2026-10" (monthly). count is atomic $inc.
type OtpCounterDoc = { _id: string; count: number };

const OtpCounterSchema = new Schema<OtpCounterDoc>(
  {
    _id: { type: String },
    count: { type: Number, default: 0 },
  },
  { timestamps: true, _id: false },
);

export const OtpCounter: Model<OtpCounterDoc> =
  (mongoose.models.OtpCounter as Model<OtpCounterDoc>) ||
  mongoose.model<OtpCounterDoc>("OtpCounter", OtpCounterSchema);
