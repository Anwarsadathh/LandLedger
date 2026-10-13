"use client";

import { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export type NavUser = { name: string; isModerator: boolean } | null;

const link = "text-[var(--muted)] hover:text-[var(--foreground)]";

export function SiteNav({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const items = (onClick?: () => void) => (
    <>
      <Link href="/" className={link} onClick={onClick}>
        Marketplace
      </Link>
      {user ? (
        <>
          <Link href="/listings/new" className={link} onClick={onClick}>
            List a property
          </Link>
          <Link href="/dashboard" className={link} onClick={onClick}>
            Dashboard
          </Link>
          {user.isModerator && (
            <Link href="/admin" className={link} onClick={onClick}>
              Admin
            </Link>
          )}
          <SignOutButton />
        </>
      ) : (
        <>
          <Link href="/signin" className={link} onClick={onClick}>
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary px-3 py-1.5" onClick={onClick}>
            Sign up
          </Link>
        </>
      )}
    </>
  );

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-4 text-sm sm:flex">{items()}</nav>

      {/* Mobile toggle */}
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-lg sm:hidden"
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Mobile panel */}
      {open && (
        <div className="absolute inset-x-0 top-full z-20 border-b border-[var(--border)] bg-[var(--card)] shadow-sm sm:hidden">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-4 text-sm">
            {items(close)}
          </div>
        </div>
      )}
    </>
  );
}
