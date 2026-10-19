import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { getUserProfile } from "@/server/modules/auth/service";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My profile — OROVA" };

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  BROKER: "Broker",
  INSIDE_SALES: "Inside sales",
  LISTING_REVIEWER: "Listing reviewer",
  RESEARCH_ANALYST: "Research analyst",
  LEGAL_REVIEWER: "Legal reviewer",
  FIELD_EXECUTIVE: "Field executive",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
  PUBLIC: "Public",
};

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ProfilePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/signin?next=/profile");

  const profile = await getUserProfile(current.id);
  if (!profile) redirect("/signin?next=/profile");

  const initial = profile.name.trim().charAt(0).toUpperCase() || "U";
  const viaGoogle = profile.authProvider === "google";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Account</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">My profile</h1>
      </div>

      {/* ---------- identity card ---------- */}
      <div className="card flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            referrerPolicy="no-referrer"
            className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-[var(--border)]"
          />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-2xl font-bold text-white">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">{profile.name}</h2>
          <p className="mt-0.5 break-all text-sm text-[var(--muted)]">{profile.email || "No email on file"}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </span>
            {viaGoogle ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted)]">
                <GoogleGlyph /> Google account
              </span>
            ) : (
              <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted)]">
                Email &amp; password
              </span>
            )}
            {profile.emailVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ---------- details ---------- */}
      <div className="card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Account details</h3>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Row label="Full name" value={profile.name} />
          <Row label="Email" value={profile.email || "—"} />
          <Row label="Mobile" value={profile.phone ? `+91 ${profile.phone}${profile.phoneVerified ? " · Verified" : ""}` : "—"} />
          <Row label="First name" value={profile.givenName ?? "—"} />
          <Row label="Last name" value={profile.familyName ?? "—"} />
          <Row label="Sign-in method" value={viaGoogle ? "Google" : "Email & password"} />
          <Row label="Role" value={ROLE_LABELS[profile.role] ?? profile.role} />
          <Row label="Locale" value={profile.locale ?? "—"} />
          <Row label="Member since" value={fmtDate(profile.createdAt)} />
          <Row label="Last sign-in" value={fmtDate(profile.lastLoginAt)} />
        </dl>
      </div>

      {/* ---------- actions ---------- */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard" className="btn-primary">My listings</Link>
        <Link href="/listings/new" className="btn-accent">List a property</Link>
        <SignOutButton className="btn-ghost" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{value}</dd>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.21 7.21 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}
