"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteNav, type NavUser } from "@/components/SiteNav";

const BARE_ROUTES = ["/signin", "/signup"];

export function AppChrome({ user, children }: { user: NavUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  // Auth pages render full-bleed, with no site header or footer (all screens).
  if (bare) return <>{children}</>;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center" aria-label="OROVA home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/orova-logo.svg" alt="OROVA" className="h-8 w-auto sm:h-10" />
          </Link>
          <SiteNav user={user} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <p className="font-semibold tracking-[0.18em]">OROVA</p>
              <p className="mt-2 max-w-xs text-sm text-[var(--muted)]">
                A transparent marketplace for land &amp; property across India.
              </p>
            </div>
            <FooterCol
              title="Explore"
              links={[
                { label: "Marketplace", href: "/" },
                { label: "Land & plots", href: "/?type=LAND_PLOT" },
                { label: "Residential", href: "/?type=RESIDENTIAL" },
                { label: "Commercial", href: "/?type=COMMERCIAL" },
              ]}
            />
            <FooterCol
              title="Account"
              links={[
                { label: "List a property", href: "/listings/new" },
                { label: "Dashboard", href: "/dashboard" },
                { label: "Sign in", href: "/signin" },
                { label: "Create account", href: "/signup" },
              ]}
            />
          </div>
          <div className="mt-8 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)]">
            <p className="mb-3">Listings are not legally verified — see each listing&apos;s status for what was actually checked.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>© {new Date().getFullYear()} OROVA. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <Link href="/privacy" className="hover:text-[var(--accent)]">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-[var(--accent)]">Terms &amp; Conditions</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</p>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-[var(--foreground)] hover:text-[var(--accent)]">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
