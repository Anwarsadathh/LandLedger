import { cookies } from "next/headers";
import { ok } from "@/lib/http";
import { SESSION_COOKIE } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/auth/logout — clear the session cookie.
export async function POST() {
  (await cookies()).delete(SESSION_COOKIE);
  return ok({ ok: true });
}
