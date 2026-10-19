import { connectToDatabase } from "@/server/db/connect";
import { User } from "@/server/db/models/user";
import { ApiError } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { recordAudit } from "@/server/modules/audit/service";
import type { Role } from "@/server/auth/roles";
import type { LoginInput, RegisterInput } from "./schema";

export type AuthedUser = { id: string; name: string; email: string; role: Role };

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  authProvider: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  avatarUrl: string | null;
  givenName: string | null;
  familyName: string | null;
  locale: string | null;
  createdAt: Date | null;
  lastLoginAt: Date | null;
};

/** Full profile for the account page. */
export async function getUserProfile(id: string): Promise<UserProfile | null> {
  await connectToDatabase();
  let user;
  try {
    user = await User.findById(id);
  } catch {
    return null;
  }
  if (!user) return null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email ?? "",
    phone: user.phone ?? null,
    role: user.role as Role,
    authProvider: (user.authProvider as string) ?? "password",
    emailVerified: Boolean(user.emailVerified),
    phoneVerified: Boolean(user.phoneVerified),
    avatarUrl: user.avatarUrl ?? null,
    givenName: user.givenName ?? null,
    familyName: user.familyName ?? null,
    locale: user.locale ?? null,
    createdAt: (user as unknown as { createdAt?: Date }).createdAt ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

/** Public self-signup — always creates an OWNER. */
export async function registerUser(input: RegisterInput): Promise<AuthedUser> {
  await connectToDatabase();
  const email = input.email.toLowerCase().trim();

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError("EMAIL_TAKEN", "An account with this email already exists.", 409);
  }
  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name.trim(),
    email,
    passwordHash,
    role: "OWNER",
    status: "ACTIVE",
  });

  await recordAudit({
    actorId: String(user._id),
    actorRole: "OWNER",
    action: "USER_REGISTERED",
    entityType: "User",
    entityId: String(user._id),
  });

  return { id: String(user._id), name: user.name, email: email, role: user.role as Role };
}

/**
 * Google sign-in / sign-up. The email is already verified by Google. We link by
 * email to an existing account (adding the googleId), or create a new OWNER.
 */
export async function findOrCreateGoogleUser(profile: {
  googleId: string;
  email: string;
  emailVerified?: boolean;
  name: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  locale?: string;
}): Promise<AuthedUser & { needsPhone: boolean }> {
  await connectToDatabase();
  const email = profile.email.toLowerCase().trim();

  let user = await User.findOne({ $or: [{ googleId: profile.googleId }, { email }] });

  if (user) {
    if (user.status !== "ACTIVE") {
      throw new ApiError("ACCOUNT_SUSPENDED", "This account is suspended.", 403);
    }
    const linkedNow = !user.googleId;
    if (linkedNow) user.googleId = profile.googleId;
    // refresh provider profile fields on each sign-in (keep a user-set name as-is)
    if (profile.emailVerified) user.emailVerified = true;
    if (profile.picture) user.avatarUrl = profile.picture;
    if (profile.givenName) user.givenName = profile.givenName;
    if (profile.familyName) user.familyName = profile.familyName;
    if (profile.locale) user.locale = profile.locale;
    user.lastLoginAt = new Date();
    await user.save();
    if (linkedNow) {
      await recordAudit({
        actorId: String(user._id),
        actorRole: user.role as Role,
        action: "USER_LINKED_GOOGLE",
        entityType: "User",
        entityId: String(user._id),
      });
    }
    return { id: String(user._id), name: user.name, email, role: user.role as Role, needsPhone: !user.phone };
  }

  user = await User.create({
    name: profile.name.trim() || email.split("@")[0],
    email,
    googleId: profile.googleId,
    authProvider: "google",
    emailVerified: profile.emailVerified ?? false,
    avatarUrl: profile.picture,
    givenName: profile.givenName,
    familyName: profile.familyName,
    locale: profile.locale,
    role: "OWNER",
    status: "ACTIVE",
    lastLoginAt: new Date(),
  });

  await recordAudit({
    actorId: String(user._id),
    actorRole: "OWNER",
    action: "USER_REGISTERED_GOOGLE",
    entityType: "User",
    entityId: String(user._id),
  });

  return { id: String(user._id), name: user.name, email, role: user.role as Role, needsPhone: true };
}

/**
 * Mobile-OTP sign-in / sign-up. The number is already verified by the OTP step.
 * Finds the user by phone, or creates a new OWNER. An optional name is used for
 * new accounts (or to fill a missing name).
 */
export async function findOrCreatePhoneUser(phone: string, name?: string): Promise<AuthedUser> {
  await connectToDatabase();

  let user = await User.findOne({ phone });
  if (user) {
    if (user.status !== "ACTIVE") {
      throw new ApiError("ACCOUNT_SUSPENDED", "This account is suspended.", 403);
    }
    user.phoneVerified = true;
    if (name && !user.name) user.name = name.trim();
    user.lastLoginAt = new Date();
    await user.save();
    return { id: String(user._id), name: user.name, email: user.email ?? "", role: user.role as Role };
  }

  user = await User.create({
    name: name?.trim() || "Member",
    phone,
    authProvider: "phone",
    phoneVerified: true,
    role: "OWNER",
    status: "ACTIVE",
    lastLoginAt: new Date(),
  });

  await recordAudit({
    actorId: String(user._id),
    actorRole: "OWNER",
    action: "USER_REGISTERED_PHONE",
    entityType: "User",
    entityId: String(user._id),
  });

  return { id: String(user._id), name: user.name, email: user.email ?? "", role: user.role as Role };
}

/** Set / update the signed-in user's mobile number (enforces uniqueness). */
export async function setUserPhone(userId: string, phone: string): Promise<void> {
  await connectToDatabase();
  const taken = await User.findOne({ phone, _id: { $ne: userId } });
  if (taken) {
    throw new ApiError("PHONE_TAKEN", "An account with this mobile number already exists.", 409);
  }
  const res = await User.updateOne({ _id: userId }, { $set: { phone } });
  if (res.matchedCount === 0) {
    throw new ApiError("NOT_FOUND", "User not found.", 404);
  }
}

export async function loginUser(input: LoginInput): Promise<AuthedUser> {
  await connectToDatabase();
  const email = input.email.toLowerCase().trim();

  const user = await User.findOne({ email }).select("+passwordHash");
  // Same error for missing user and wrong password (no account enumeration).
  if (!user || !user.passwordHash) {
    throw new ApiError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
  }
  if (user.status !== "ACTIVE") {
    throw new ApiError("ACCOUNT_SUSPENDED", "This account is suspended.", 403);
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new ApiError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
  }

  user.lastLoginAt = new Date();
  await user.save();

  return { id: String(user._id), name: user.name, email, role: user.role as Role };
}
