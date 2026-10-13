import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { moderationDecisionSchema } from "@/server/modules/listings/schema";
import { moderate } from "@/server/modules/listings/service";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/admin/listings/{id}/decision — approve / publish / reject /
// request correction (reviewer/admin; reason required for the last two).
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  try {
    const { id } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return fail("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId });
    const input = moderationDecisionSchema.parse(await req.json());
    const listing = await moderate(id, input, user);
    return ok(listing, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
