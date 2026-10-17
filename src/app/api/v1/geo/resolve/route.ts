import type { NextRequest } from "next/server";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only Google Maps hosts — prevents this endpoint being used as an SSRF proxy.
const ALLOWED = [
  "google.com",
  "goo.gl",
  "app.goo.gl",
  "google.co.in",
];

function hostAllowed(host: string): boolean {
  const h = host.toLowerCase();
  return ALLOWED.some((d) => h === d || h.endsWith("." + d));
}

function extractCoords(text: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // /maps/@lat,lng,zoom
    /[?&](?:q|ll|query|daddr|saddr)=(-?\d+\.\d+),(-?\d+\.\d+)/, // ?q=lat,lng
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // data param
    /(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/, // bare "lat, lng"
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

// GET /api/v1/geo/resolve?url=<google maps link> -> { lat, lng }
export async function GET(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const raw = req.nextUrl.searchParams.get("url");
    if (!raw) return fail("BAD_REQUEST", "Missing url.", { status: 400, requestId });

    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      return fail("BAD_URL", "That doesn't look like a link.", { status: 400, requestId });
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return fail("BAD_URL", "Only http(s) links are supported.", { status: 400, requestId });
    }
    if (!hostAllowed(u.hostname)) {
      return fail("UNSUPPORTED", "Please paste a Google Maps link.", { status: 400, requestId });
    }

    // Coordinates already in the link?
    let coords = extractCoords(raw);
    // Otherwise follow the (possibly shortened) link and read the final URL/body.
    if (!coords) {
      const res = await fetch(raw, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; OROVA/1.0)" },
      });
      coords = extractCoords(res.url);
      if (!coords) coords = extractCoords(await res.text());
    }

    if (!coords) {
      return fail("NOT_FOUND", "Couldn't read coordinates from that link.", { status: 422, requestId });
    }
    return ok(coords, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
