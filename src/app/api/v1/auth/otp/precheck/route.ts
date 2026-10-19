import { reserveSend } from "@/server/auth/otp";
import { ApiError, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/auth/otp/precheck — Layer A gate before a Firebase phone send.
export async function POST() {
  const requestId = newRequestId();
  try {
    const allowed = await reserveSend();
    if (!allowed) {
      throw new ApiError(
        "OTP_LIMIT",
        "Mobile verification is temporarily unavailable. Please sign up with email instead.",
        429,
      );
    }
    return ok({ ok: true }, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
