import type { NextRequest } from "next/server";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reverse geocoding via OpenStreetMap Nominatim (free, keyless).
// NOTE: Nominatim's usage policy allows light use (≤1 req/sec, real User-Agent).
// One lookup per dropped pin is fine; for high volume, self-host Nominatim or
// move to a paid geocoder (handover spec §12).
type NominatimAddress = {
  state?: string;
  state_district?: string;
  county?: string;
  district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
  neighbourhood?: string;
  hamlet?: string;
};

// GET /api/v1/geo/reverse?lat=&lng=  ->  { state, city, locality, display }
export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const lat = Number(req.nextUrl.searchParams.get("lat"));
    const lng = Number(req.nextUrl.searchParams.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return fail("BAD_REQUEST", "Valid lat and lng are required.", { status: 400, requestId });
    }

    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "LandLedger/1.0 (property listing app)",
        "Accept-Language": "en",
      },
    });
    if (!res.ok) {
      return fail("GEOCODER_ERROR", "Reverse geocoding failed.", { status: 502, requestId });
    }
    const json = (await res.json()) as { address?: NominatimAddress; display_name?: string };
    const a = json.address ?? {};

    const state = a.state ?? null;
    const city =
      a.state_district ?? a.district ?? a.county ?? a.city ?? a.municipality ?? a.town ?? a.village ?? null;
    const locality = a.suburb ?? a.neighbourhood ?? a.village ?? a.town ?? a.hamlet ?? null;

    return ok({ state, city, locality, display: json.display_name ?? null }, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
