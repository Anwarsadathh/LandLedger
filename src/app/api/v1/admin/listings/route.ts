import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { listAllForAdmin } from "@/server/modules/listings/service";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/admin/listings?status=PUBLISHED — all listings (admin/reviewer).
export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const user = await getCurrentUser();
    if (!user) return fail("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId });
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const items = await listAllForAdmin(user, { status });
    return ok({ items }, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
