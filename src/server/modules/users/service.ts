import { connectToDatabase } from "@/server/db/connect";
import { User } from "@/server/db/models/user";
import { ApiError } from "@/lib/http";
import { MODERATOR_ROLES, hasRole } from "@/server/auth/roles";
import type { CurrentUser } from "@/server/auth/current-user";

export type AdminUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  authProvider: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  avatarUrl: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
};

type UserRow = {
  _id: unknown;
  name?: string;
  email?: string | null;
  phone?: string | null;
  role?: string;
  status?: string;
  authProvider?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  avatarUrl?: string | null;
  createdAt?: Date;
  lastLoginAt?: Date;
};

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null);

/** All registered users for the admin dashboard (moderators only). No secrets:
 *  passwordHash is `select:false`, and we never project it. */
export async function listUsersForAdmin(current: CurrentUser): Promise<{
  users: AdminUser[];
  total: number;
  byRole: Record<string, number>;
}> {
  if (!hasRole(current.role, MODERATOR_ROLES)) {
    throw new ApiError("FORBIDDEN", "Admin / reviewer access required.", 403);
  }
  await connectToDatabase();

  const docs = (await User.find(
    {},
    {
      name: 1,
      email: 1,
      phone: 1,
      role: 1,
      status: 1,
      authProvider: 1,
      emailVerified: 1,
      phoneVerified: 1,
      avatarUrl: 1,
      createdAt: 1,
      lastLoginAt: 1,
    },
  )
    .sort({ createdAt: -1 })
    .limit(500)
    .lean()) as unknown as UserRow[];

  const users: AdminUser[] = docs.map((d) => ({
    id: String(d._id),
    name: d.name ?? "—",
    email: d.email ?? null,
    phone: d.phone ?? null,
    role: d.role ?? "OWNER",
    status: d.status ?? "ACTIVE",
    authProvider: d.authProvider ?? "password",
    emailVerified: !!d.emailVerified,
    phoneVerified: !!d.phoneVerified,
    avatarUrl: d.avatarUrl ?? null,
    createdAt: iso(d.createdAt),
    lastLoginAt: iso(d.lastLoginAt),
  }));

  const byRole: Record<string, number> = {};
  for (const u of users) byRole[u.role] = (byRole[u.role] ?? 0) + 1;

  return { users, total: users.length, byRole };
}
