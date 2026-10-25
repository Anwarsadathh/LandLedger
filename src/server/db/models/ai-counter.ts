import mongoose, { Schema, type Model } from "mongoose";

// Per-day counter for the AI assistant call cap (cost guard). One doc per day:
//   _id "ai:d:2026-10-25". count is an atomic $inc. Mirrors OtpCounter (Layer A).
type AiCounterDoc = { _id: string; count: number };

const AiCounterSchema = new Schema<AiCounterDoc>(
  {
    _id: { type: String },
    count: { type: Number, default: 0 },
  },
  { timestamps: true, _id: false },
);

export const AiCounter: Model<AiCounterDoc> =
  (mongoose.models.AiCounter as Model<AiCounterDoc>) ||
  mongoose.model<AiCounterDoc>("AiCounter", AiCounterSchema);
