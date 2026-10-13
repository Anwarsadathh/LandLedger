import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { submitForReview } from "@/server/modules/listings/service";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/listings/{id}/submit — submit a draft for content review.
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  try {
    const { id } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return fail("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId });
    const listing = await submitForReview(id, user);
    return ok(listing, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
