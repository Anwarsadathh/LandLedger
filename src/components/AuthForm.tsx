"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileOtpForm } from "@/components/MobileOtpForm";
import type { Role } from "@/server/auth/roles";

const ADMINISH: Role[] = ["ADMIN", "SUPER_ADMIN", "LISTING_REVIEWER"];

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";

const OAUTH_ERRORS: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_unconfigured:
    "Google sign-in isn’t set up on the server (missing keys). Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local and restart the dev server.",
  google_state: "Security check failed — please try signing in again.",
  google_token:
    "Couldn’t finish Google sign-in (token step). Check the client secret and that the redirect URI is registered in Google Console.",
  google_profile: "Couldn’t read your Google profile. Please try again.",
  google_email: "Your Google account didn’t return a verified email.",
  google_error: "Something went wrong with Google sign-in. Please try again.",
};

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMode, setMobileMode] = useState(false);

  const isSignup = mode === "signup";
  const nextQs = next ? `?next=${encodeURIComponent(next)}` : "";

  const oauthError = params.get("error");
  const oauthErrorMsg = oauthError
    ? (OAUTH_ERRORS[oauthError] ?? `Couldn’t sign in with Google (${oauthError}).`)
    : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const body = isSignup
      ? { name: f.get("name"), email: f.get("email"), password: f.get("password") }
      : { email: f.get("email"), password: f.get("password") };

    try {
      const res = await fetch(`/api/v1/auth/${isSignup ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.details?.[0]?.issue ?? json.error?.message ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      const role = json.data.role as Role;
      const dest = next || (ADMINISH.includes(role) ? "/admin" : "/dashboard");
      router.push(dest);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:grid md:grid-cols-2">
      {/* ---------- photo panel ---------- */}
      <div
        className="relative flex min-h-[50vh] shrink-0 flex-col justify-end p-6 pb-14 text-white md:min-h-screen md:justify-center md:p-14"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(27,24,19,0.2) 0%, rgba(27,24,19,0.45) 55%, rgba(27,24,19,0.82) 100%), url(${HERO_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
        }}
      >
        <Link href="/" className="absolute left-6 top-6 inline-flex items-center md:left-14 md:top-10" aria-label="OROVA home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/orova-logo-light.svg" alt="OROVA" className="h-11 w-auto" />
        </Link>

        <div>
          <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight drop-shadow-sm md:text-5xl">
            Discover Your<br />Dream Home
          </h2>
          <p className="mt-3 hidden max-w-sm text-sm text-white/75 md:block">
            Plots, homes and farmland across India — honestly listed, human-reviewed, and free to post.
          </p>
        </div>
      </div>

      {/* ---------- form sheet ---------- */}
      <div className="relative z-10 -mt-8 flex flex-1 flex-col justify-center rounded-t-[28px] bg-[var(--card)] p-6 pt-8 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] sm:p-10 md:mt-0 md:rounded-none md:pt-10 md:shadow-none">
        <div className="mx-auto w-full max-w-sm">
          {/* pill tabs */}
          <div className="flex rounded-full border border-[var(--border)] bg-[var(--background)] p-1">
            <Link
              href={`/signin${nextQs}`}
              className={`flex-1 rounded-full py-2.5 text-center text-sm font-semibold transition ${
                !isSignup ? "bg-[var(--foreground)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Login
            </Link>
            <Link
              href={`/signup${nextQs}`}
              className={`flex-1 rounded-full py-2.5 text-center text-sm font-semibold transition ${
                isSignup ? "bg-[var(--foreground)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Sign Up
            </Link>
          </div>

          {/* Sign-up leads with OTP-verified mobile (email/password sign-up is
              removed to cut spam/bot registrations). Email login stays for
              existing users + admins on the Login tab. */}
          {!isSignup && (
            <>
              {error && (
                <div className="mt-5 rounded-xl border border-red-600/30 bg-red-600/10 p-3 text-sm text-red-700">{error}</div>
              )}

              <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
                  Email
                  <input name="email" type="email" required className="input" placeholder="you@example.com" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
                  Password
                  <input name="password" type="password" required minLength={1} className="input" placeholder="Your password" />
                </label>
                <button type="submit" disabled={busy} className="btn-primary mt-1 py-3">
                  {busy ? "Please wait…" : "Login"}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs text-[var(--muted)]">
                <span className="h-px flex-1 bg-[var(--border)]" />
                or login with
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>
            </>
          )}

          {isSignup && mobileMode ? (
            <MobileOtpForm bare onBack={() => setMobileMode(false)} />
          ) : (
            <>
              {isSignup && (
                <p className="mt-5 text-center text-sm text-[var(--muted)]">
                  Sign up in seconds — we verify your mobile with a one-time code. No password to remember.
                </p>
              )}

              {oauthErrorMsg && (
                <p className="mb-2.5 mt-4 rounded-xl border border-red-600/30 bg-red-600/10 p-2.5 text-center text-xs text-red-700">
                  {oauthErrorMsg}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2.5">
                {isSignup ? (
                  <>
                    <button type="button" onClick={() => setMobileMode(true)} className="btn-primary justify-center py-3">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="7" y="3" width="10" height="18" rx="2.5" />
                        <path d="M11 18h2" />
                      </svg>
                      Sign up with mobile number
                    </button>
                    <SocialButton label="Continue with Google" icon={<GoogleIcon />} href={`/api/v1/auth/google${nextQs}`} />
                  </>
                ) : (
                  <>
                    <SocialButton label="Continue with Google" icon={<GoogleIcon />} href={`/api/v1/auth/google${nextQs}`} />
                    <SocialButton label="Continue with mobile number" icon={<PhoneIcon />} href={`/mobile-signin${nextQs}`} />
                  </>
                )}
              </div>
            </>
          )}

          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link href={`/signin${nextQs}`} className="font-semibold text-[var(--accent)] hover:underline">Login</Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link href={`/signup${nextQs}`} className="font-semibold text-[var(--accent)] hover:underline">Create an account</Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function SocialButton({
  label,
  icon,
  onClick,
  href,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "flex items-center justify-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--card)] py-3 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--foreground)]";
  if (href) {
    return (
      <a href={href} className={cls}>
        {icon}
        {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {icon}
      {label}
    </button>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.21 7.21 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}
