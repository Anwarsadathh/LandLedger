import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/server/auth/session";
import { MODERATOR_ROLES } from "@/server/auth/roles";

// Route protection. Runs on the Edge runtime — only uses `jose` (no DB).
// API routes do their own auth checks; this guards the pages.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const url = new URL("/signin", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Admin area requires a moderator/admin role; others go to their dashboard.
  if (pathname.startsWith("/admin") && !MODERATOR_ROLES.includes(session.role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/listings/new", "/admin/:path*"],
};
