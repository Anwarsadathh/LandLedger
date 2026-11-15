import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/current-user";
import { updateEnquiryStatus } from "@/server/modules/enquiries/admin";
import { LEAD_STATUSES } from "@/server/domain/enums";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ status: z.enum(LEAD_STATUSES) });

// PATCH /api/v1/admin/enquiries/{id} — move a lead through the pipeline.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  try {
    const user = await getCurrentUser();
    if (!user) return fail("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId });
    const { id } = await ctx.params;
    const { status } = Body.parse(await req.json());
    return ok(await updateEnquiryStatus(user, id, status), { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
