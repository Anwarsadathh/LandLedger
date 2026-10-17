import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";
import { ROLES } from "@/server/auth/roles";

// Minimal user record for Phase 1. Real auth (Auth.js + OTP, MFA for privileged
// roles) replaces the stubbed identity before launch; this model is where those
// accounts will land.
const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    // Not selected by default so it never leaks; login explicitly .select()s it.
    passwordHash: { type: String, select: false },
    // OAuth (Google) identity. googleId is the provider's stable subject id.
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ["password", "google"], default: "password" },
    emailVerified: { type: Boolean, default: false },
    // Profile data collected from the identity provider.
    avatarUrl: { type: String },
    givenName: { type: String },
    familyName: { type: String },
    locale: { type: String },
    role: { type: String, enum: ROLES, default: "OWNER", index: true },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>("User", UserSchema);
