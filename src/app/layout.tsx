import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/server/auth/current-user";
import { MODERATOR_ROLES } from "@/server/auth/roles";
import { SiteNav } from "@/components/SiteNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LandLedger — Land & property across India",
  description:
    "A transparent marketplace for plots, homes and farmland across India. Every listing shows exactly what was checked.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const isModerator = user ? MODERATOR_ROLES.includes(user.role) : false;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z" />
                  <path d="M3 12l9 4.5 9-4.5" />
                  <path d="M3 16.5 12 21l9-4.5" />
                </svg>
              </span>
              <span className="text-lg font-bold tracking-tight">LandLedger</span>
            </Link>
            <SiteNav user={user ? { name: user.name, isModerator } : null} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="mt-12 border-t border-[var(--border)] bg-[var(--card)]">
          <div className="mx-auto w-full max-w-6xl px-4 py-10">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-1">
                <p className="font-semibold tracking-tight">LandLedger</p>
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
            <div className="mt-8 flex flex-col gap-1 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)]">
              <p>
                Listings are not legally verified — see each listing&apos;s status for what was actually
                checked.
              </p>
              <p>© {new Date().getFullYear()} LandLedger · Working MVP.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</p>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-[var(--foreground)] hover:text-[var(--primary)]">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
