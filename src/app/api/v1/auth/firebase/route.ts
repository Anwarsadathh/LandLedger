import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { verifyFirebaseIdToken } from "@/server/auth/firebase-admin";
import { findOrCreatePhoneUser } from "@/server/modules/auth/service";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/server/auth/session";
import { ApiError, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  idToken: z.string().min(10),
  name: z.string().trim().max(120).optional(),
});

// POST /api/v1/auth/firebase — verify a Firebase phone-auth token, sign in / sign up.
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const { idToken, name } = schema.parse(await req.json());

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(idToken);
    } catch {
      throw new ApiError("FIREBASE_INVALID", "Could not verify your phone sign-in. Please try again.", 401);
    }

    const e164 = decoded.phone_number;
    if (!e164) throw new ApiError("NO_PHONE", "No phone number was returned by the sign-in.", 400);
    const phone10 = e164.replace(/^\+?91/, ""); // store normalized 10-digit

    const user = await findOrCreatePhoneUser(phone10, name);
    const token = await signSession({ sub: user.id, role: user.role, name: user.name });
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
    return ok(user, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
