"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Role } from "@/server/auth/roles";

const ADMINISH: Role[] = ["ADMIN", "SUPER_ADMIN", "LISTING_REVIEWER"];

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

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
    <div className="mx-auto mt-6 max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isSignup ? "Create your account" : "Sign in"}
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {isSignup
          ? "List and manage your own properties."
          : "Welcome back. Owners and admins sign in here."}
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-600/40 bg-red-600/10 p-3 text-sm">{error}</div>
      )}

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
        {isSignup && (
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Full name
            <input name="name" required minLength={2} className="input" placeholder="Your name" />
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Email
          <input name="email" type="email" required className="input" placeholder="you@example.com" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={isSignup ? 8 : 1}
            className="input"
            placeholder={isSignup ? "At least 8 characters" : "Your password"}
          />
        </label>
        <button type="submit" disabled={busy} className="btn-primary mt-1">
          {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-[var(--muted)]">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/signin" className="text-[var(--primary)] hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="text-[var(--primary)] hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
