import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "g_oauth_state";
const NEXT_COOKIE = "g_oauth_next";

// GET /api/v1/auth/google — start the Google OAuth 2.0 authorization-code flow.
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/signin?error=google_unconfigured", origin));
  }

  const redirectUri = `${origin}/api/v1/auth/google/callback`;
  const rawNext = req.nextUrl.searchParams.get("next") ?? "";
  // only allow relative, non-protocol-relative paths (no open redirect)
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";

  const state = crypto.randomUUID();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authUrl);
  const secure = process.env.NODE_ENV === "production";
  const opts = { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: 600 };
  res.cookies.set(STATE_COOKIE, state, opts);
  res.cookies.set(NEXT_COOKIE, next, opts);
  return res;
}
