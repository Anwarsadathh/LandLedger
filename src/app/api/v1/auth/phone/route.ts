import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { updatePhoneSchema } from "@/server/modules/auth/schema";
import { setUserPhone } from "@/server/modules/auth/service";
import { ApiError, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/auth/phone — set the signed-in user's mobile number.
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHENTICATED", "Please sign in first.", 401);
    const { phone } = updatePhoneSchema.parse(await req.json());
    await setUserPhone(user.id, phone);
    return ok({ phone }, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
