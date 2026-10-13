import { getCurrentUser } from "@/server/auth/current-user";
import { fail, ok } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/auth/me — current session identity, or 401.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "Not signed in.", { status: 401 });
  return ok(user);
}
