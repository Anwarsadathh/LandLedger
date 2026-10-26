import type { NextRequest } from "next/server";
import { createRatingSchema } from "@/server/modules/ratings/schema";
import { submitRating } from "@/server/modules/ratings/service";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/listings/{id}/rating — public, rate-limited. Returns the owner's
// recomputed aggregate rating { average, count }.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  try {
    const { id } = await ctx.params;

    const limit = rateLimit(`rating:${clientIp(req)}`, { limit: 5, windowMs: 60_000 });
    if (!limit.ok) {
      return fail("RATE_LIMITED", "Too many ratings. Please wait a minute and try again.", {
        status: 429,
        requestId,
      });
    }

    const input = createRatingSchema.parse(await req.json());
    const result = await submitRating(id, input);
    return ok(result, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
