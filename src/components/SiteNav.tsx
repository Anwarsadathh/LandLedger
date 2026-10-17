"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";

export type NavUser = { name: string; isModerator: boolean } | null;

export function SiteNav({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  const items = [
    { href: "/", label: "Marketplace", show: true },
    { href: "/?type=LAND_PLOT", label: "Land & Plots", show: true },
    { href: "/?type=RESIDENTIAL", label: "Homes", show: true },
    { href: "/?type=COMMERCIAL", label: "Commercial", show: true },
    { href: "/dashboard", label: "Dashboard", show: !!user },
    { href: "/admin", label: "Admin", show: !!user?.isModerator },
  ].filter((i) => i.show);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const linkClass = (href: string) =>
    `rounded-full px-3.5 py-2 text-sm font-medium transition ${
      isActive(href)
        ? "bg-[var(--foreground)] text-white"
        : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
    }`;

  return (
    <>
      {/* ---------- Desktop ---------- */}
      <nav className="hidden items-center gap-1 md:flex">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className={linkClass(i.href)}>
            {i.label}
          </Link>
        ))}

        <Link
          href="/listings/new"
          className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
        >
          List property
          <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white">Free</span>
        </Link>

        <span className="mx-2 h-5 w-px bg-[var(--border)]" />

        {user ? (
          <div className="flex items-center gap-2.5">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-[var(--accent-soft)]"
            >
              <Avatar name={user.name} />
              <span className="text-sm font-medium">{user.name.split(" ")[0]}</span>
            </Link>
            <SignOutButton className="btn-ghost px-3 py-1.5" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/signin"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary px-4 py-2">
              Sign up
            </Link>
          </div>
        )}
      </nav>

      {/* ---------- Mobile toggle ---------- */}
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--foreground)] transition hover:bg-[var(--background)] md:hidden"
      >
        {open ? <IconX /> : <IconMenu />}
      </button>

      {/* ---------- Mobile panel ---------- */}
      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 top-[57px] z-30 cursor-default bg-black/20 md:hidden"
          />
          <div className="absolute inset-x-0 top-full z-40 border-b border-[var(--border)] bg-[var(--card)] shadow-xl md:hidden">
            <div className="mx-auto max-w-6xl px-4 py-3">
              {user && (
                <Link
                  href="/profile"
                  onClick={close}
                  className="mb-2 flex items-center gap-3 rounded-xl bg-[var(--background)] p-3"
                >
                  <Avatar name={user.name} big />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-[var(--muted)]">View profile · {user.isModerator ? "Admin" : "Member"}</p>
                  </div>
                </Link>
              )}

              <nav className="flex flex-col gap-0.5">
                {items.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={close}
                    className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive(i.href)
                        ? "bg-[var(--foreground)] text-white"
                        : "text-[var(--foreground)] hover:bg-[var(--accent-soft)]"
                    }`}
                  >
                    {i.label}
                  </Link>
                ))}
              </nav>

              <Link
                href="/listings/new"
                onClick={close}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-[var(--accent)]"
              >
                List your property
                <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white">Free</span>
              </Link>

              <div className="mt-3 border-t border-[var(--border)] pt-3">
                {user ? (
                  <SignOutButton className="btn-ghost w-full justify-center" />
                ) : (
                  <div className="flex gap-2">
                    <Link href="/signin" onClick={close} className="btn-ghost flex-1 justify-center">
                      Sign in
                    </Link>
                    <Link href="/signup" onClick={close} className="btn-primary flex-1 justify-center">
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Avatar({ name, big = false }: { name: string; big?: boolean }) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] font-semibold text-white ${
        big ? "h-10 w-10 text-base" : "h-8 w-8 text-sm"
      }`}
    >
      {initial}
    </span>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
