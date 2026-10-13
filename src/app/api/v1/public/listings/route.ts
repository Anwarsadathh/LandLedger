import type { NextRequest } from "next/server";
import { searchPublicListings } from "@/server/modules/listings/service";
import { newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/public/listings — public search/filter/map (published only).
export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const sp = req.nextUrl.searchParams;
    const num = (v: string | null) => (v !== null && v !== "" ? Number(v) : undefined);

    const lat = num(sp.get("lat"));
    const lng = num(sp.get("lng"));
    const radiusKm = num(sp.get("radiusKm"));

    const result = await searchPublicListings({
      state: sp.get("state") ?? undefined,
      city: sp.get("city") ?? undefined,
      listingType: sp.get("type") ?? undefined,
      priceMin: num(sp.get("priceMin")),
      priceMax: num(sp.get("priceMax")),
      q: sp.get("q") ?? undefined,
      near:
        lat !== undefined && lng !== undefined
          ? { lat, lng, radiusKm: radiusKm ?? 25 }
          : undefined,
      limit: num(sp.get("limit")),
      cursor: sp.get("cursor") ?? undefined,
    });

    return ok(result, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
