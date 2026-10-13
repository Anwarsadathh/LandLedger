import { getCurrentUser } from "@/server/auth/current-user";
import { adminStats } from "@/server/modules/listings/service";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/admin/stats — dashboard counts (admin/reviewer).
export async function GET() {
  const requestId = newRequestId();
  try {
    const user = await getCurrentUser();
    if (!user) return fail("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId });
    return ok(await adminStats(user), { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
