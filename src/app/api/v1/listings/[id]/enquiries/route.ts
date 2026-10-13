import type { NextRequest } from "next/server";
import { createEnquirySchema } from "@/server/modules/enquiries/schema";
import { createEnquiry } from "@/server/modules/enquiries/service";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/listings/{id}/enquiries — public, rate-limited, consent required.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  try {
    const { id } = await ctx.params;

    const limit = rateLimit(`enquiry:${clientIp(req)}`, { limit: 5, windowMs: 60_000 });
    if (!limit.ok) {
      return fail("RATE_LIMITED", "Too many enquiries. Please wait a minute and try again.", {
        status: 429,
        requestId,
      });
    }

    const body = await req.json();
    const input = createEnquirySchema.parse(body);
    const result = await createEnquiry(id, input);
    return ok(result, { status: result.duplicate ? 200 : 201, requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
