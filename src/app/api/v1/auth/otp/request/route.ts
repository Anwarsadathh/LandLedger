import type { NextRequest } from "next/server";
import { otpRequestSchema } from "@/server/modules/auth/schema";
import { sendOtp } from "@/server/auth/otp";
import { ApiError, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/auth/otp/request — send a one-time code to a mobile number.
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const { phone } = otpRequestSchema.parse(await req.json());
    const result = await sendOtp(`+91${phone}`);
    if (!result.ok) {
      if (result.error === "cap_reached") {
        throw new ApiError(
          "OTP_LIMIT",
          "Mobile verification is temporarily unavailable. Please sign up with email instead.",
          429,
        );
      }
      throw new ApiError("OTP_SEND_FAILED", "Couldn’t send the code. Please try again.", 502);
    }
    return ok({ sent: true, dev: result.dev ?? false }, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
