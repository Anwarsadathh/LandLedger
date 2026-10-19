import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { otpVerifySchema } from "@/server/modules/auth/schema";
import { checkOtp } from "@/server/auth/otp";
import { findOrCreatePhoneUser } from "@/server/modules/auth/service";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/server/auth/session";
import { ApiError, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/auth/otp/verify — check the code, sign the user in (create if new).
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const { phone, code, name } = otpVerifySchema.parse(await req.json());
    const result = await checkOtp(`+91${phone}`, code);
    if (!result.ok) {
      throw new ApiError("OTP_INVALID", "That code is incorrect or has expired.", 401);
    }
    const user = await findOrCreatePhoneUser(phone, name);
    const token = await signSession({ sub: user.id, role: user.role, name: user.name });
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
    return ok(user, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
