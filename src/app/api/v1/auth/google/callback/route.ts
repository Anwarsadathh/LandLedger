import { NextResponse, type NextRequest } from "next/server";
import { findOrCreateGoogleUser } from "@/server/modules/auth/service";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/server/auth/session";
import { MODERATOR_ROLES } from "@/server/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "g_oauth_state";
const NEXT_COOKIE = "g_oauth_next";

// GET /api/v1/auth/google/callback — exchange the code, sign the user in.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;
  const fail = (err: string) => NextResponse.redirect(new URL(`/signin?error=${err}`, origin));

  if (url.searchParams.get("error")) return fail("google_denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;
  const rawNext = req.cookies.get(NEXT_COOKIE)?.value ?? "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";

  if (!code || !state || !cookieState || state !== cookieState) return fail("google_state");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("google_unconfigured");

  const redirectUri = `${origin}/api/v1/auth/google/callback`;

  try {
    // 1. exchange the authorization code for tokens (server-to-server)
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return fail("google_token");
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) return fail("google_token");

    // 2. fetch the verified profile with the access token
    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) return fail("google_profile");
    const profile = (await profileRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
      locale?: string;
    };
    if (!profile.sub || !profile.email || profile.email_verified === false) {
      return fail("google_email");
    }

    // 3. find-or-create the user, then issue our own session cookie
    const user = await findOrCreateGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      emailVerified: profile.email_verified,
      name: profile.name ?? "",
      givenName: profile.given_name,
      familyName: profile.family_name,
      picture: profile.picture,
      locale: profile.locale,
    });
    const token = await signSession({ sub: user.id, role: user.role, name: user.name });

    const home = next || (MODERATOR_ROLES.includes(user.role) ? "/admin" : "/dashboard");
    // New Google users have no phone — collect it before continuing.
    const dest = user.needsPhone
      ? `/complete-profile?next=${encodeURIComponent(home)}`
      : home;
    const res = NextResponse.redirect(new URL(dest, origin));
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(NEXT_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return fail("google_error");
  }
}
