import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { registerSchema } from "@/server/modules/auth/schema";
import { registerUser } from "@/server/modules/auth/service";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/server/auth/session";
import { newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/auth/register — self-signup (creates an OWNER) + starts a session.
export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  try {
    const input = registerSchema.parse(await req.json());
    const user = await registerUser(input);
    const token = await signSession({ sub: user.id, role: user.role, name: user.name });
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
    return ok(user, { status: 201, requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
