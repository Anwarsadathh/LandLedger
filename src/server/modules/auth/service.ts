import { connectToDatabase } from "@/server/db/connect";
import { User } from "@/server/db/models/user";
import { ApiError } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { recordAudit } from "@/server/modules/audit/service";
import type { Role } from "@/server/auth/roles";
import type { LoginInput, RegisterInput } from "./schema";

export type AuthedUser = { id: string; name: string; email: string; role: Role };

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
