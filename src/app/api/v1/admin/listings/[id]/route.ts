import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { updateListingSchema } from "@/server/modules/listings/schema";
import {
  deleteListing,
  getListingForAdmin,
  updateListing,
} from "@/server/modules/listings/service";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function requireUser(requestId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, res: fail("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId }) };
  return { user, res: null };
}

// GET — full admin view of one listing (for the edit form).
export async function GET(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { id } = await ctx.params;
    const { user, res } = await requireUser(requestId);
    if (!user) return res;
    return ok(await getListingForAdmin(id, user), { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}

// PATCH — edit permitted fields.
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { id } = await ctx.params;
    const { user, res } = await requireUser(requestId);
    if (!user) return res;
    const input = updateListingSchema.parse(await req.json());
    return ok(await updateListing(id, input, user), { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}

// DELETE — permanently remove the listing (moderator only).
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const requestId = newRequestId();
  try {
    const { id } = await ctx.params;
    const { user, res } = await requireUser(requestId);
    if (!user) return res;
    return ok(await deleteListing(id, user), { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
