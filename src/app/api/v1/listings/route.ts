import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { createListingSchema } from "@/server/modules/listings/schema";
import { createDraft } from "@/server/modules/listings/service";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/listings — create a draft listing (owner/broker/staff).
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const user = await getCurrentUser();
    if (!user) return fail("UNAUTHENTICATED", "Please sign in to list a property.", { status: 401, requestId });
    const body = await req.json();
    const input = createListingSchema.parse(body);
    const listing = await createDraft(input, user);
    return ok(listing, { status: 201, requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
