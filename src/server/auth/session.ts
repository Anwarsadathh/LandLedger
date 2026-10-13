import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./roles";

// Signed-JWT session stored in an httpOnly cookie. `jose` works in both the
// Node and Edge runtimes, so the same verify runs in middleware and in route
// handlers. This is an interim auth layer — swap for Auth.js/OIDC + MFA + OTP
// before production (see docs/tech-decisions.md).

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (seconds)
const ALG = "HS256";

export type SessionPayload = {
  sub: string; // user id
  role: Role;
  name: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Add it to .env.local.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || !payload.role) return null;
    return {
      sub: payload.sub,
      role: payload.role as Role,
      name: (payload.name as string) ?? "",
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
