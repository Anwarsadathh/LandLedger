import { getPublicListingBySlug } from "@/server/modules/listings/service";
import { newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/public/listings/{slug} — public listing detail.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const requestId = newRequestId();
  try {
    const { slug } = await ctx.params;
    const listing = await getPublicListingBySlug(slug);
    return ok(listing, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
