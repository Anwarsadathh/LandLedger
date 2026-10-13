import { cookies } from "next/headers";
import type { Role } from "@/server/auth/roles";
import { SESSION_COOKIE, verifySession } from "@/server/auth/session";

export type CurrentUser = {
  id: string;
  role: Role;
  name: string;
};

/**
 * Resolve the signed-in user from the session cookie. Server-side only
 * (route handlers + server components). Returns null when not authenticated —
 * callers decide whether that is a 401 or just an anonymous view.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  return { id: session.sub, role: session.role, name: session.name };
}
