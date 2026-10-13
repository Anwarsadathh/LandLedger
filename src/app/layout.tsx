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
  title: "Property Platform",
  description:
    "Property marketplace & land-intelligence platform — Phase 1 MVP (listings, moderation, enquiries).",
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
        <header className="relative border-b border-[var(--border)] bg-[var(--card)]">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="whitespace-nowrap font-semibold tracking-tight">
              Property Platform
            </Link>
            <SiteNav user={user ? { name: user.name, isModerator } : null} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-[var(--border)] px-4 py-6 text-center text-xs text-[var(--muted)]">
          Working MVP · listings are not legally verified · see each listing&apos;s status for what was actually checked.
        </footer>
      </body>
    </html>
  );
}
