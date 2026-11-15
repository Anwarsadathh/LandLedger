import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { enquiryStats, listEnquiriesForAdmin } from "@/server/modules/enquiries/admin";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/admin/enquiries[?status=] — enquiries/leads (admin/reviewer).
export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const user = await getCurrentUser();
    if (!user) return fail("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId });
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const [items, stats] = await Promise.all([
      listEnquiriesForAdmin(user, { status }),
      enquiryStats(user),
    ]);
    return ok({ items, total: stats.total, byStatus: stats.byStatus }, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
