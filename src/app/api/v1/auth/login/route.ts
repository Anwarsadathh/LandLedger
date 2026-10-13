import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { loginSchema } from "@/server/modules/auth/schema";
import { loginUser } from "@/server/modules/auth/service";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/server/auth/session";
import { newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/auth/login — verify credentials + start a session.
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const input = loginSchema.parse(await req.json());
    const user = await loginUser(input);
    const token = await signSession({ sub: user.id, role: user.role, name: user.name });
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
    return ok(user, { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
