import mongoose, { Schema, type Model } from "mongoose";

// A rating a visitor leaves for an owner after an interaction (enquiry). Ratings
// aggregate per owner (createdById) across all their listings. One rating per
// (owner, rater phone) — re-submitting updates the existing one.
export type RatingDoc = {
  ownerId: string;
  listingId: string;
  raterPhone: string; // normalized (last 10 digits) — dedupe key, never exposed
  stars: number; // 1..5
  comment?: string;
};

const RatingSchema = new Schema<RatingDoc>(
  {
    ownerId: { type: String, required: true, index: true },
    listingId: { type: String, required: true },
    raterPhone: { type: String, required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
);

// One rating per rater per owner.
RatingSchema.index({ ownerId: 1, raterPhone: 1 }, { unique: true });

export const Rating: Model<RatingDoc> =
  (mongoose.models.Rating as Model<RatingDoc>) ||
  mongoose.model<RatingDoc>("Rating", RatingSchema);
