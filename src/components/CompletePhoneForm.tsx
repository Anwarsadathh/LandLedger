"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export function CompletePhoneForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/v1/auth/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: f.get("phone") }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.details?.[0]?.issue ?? json.error?.message ?? "Couldn’t save your number.");
        setBusy(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="card p-6 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
            <path d="M11 18h2" />
          </svg>
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">One last step</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Add your mobile number so buyers can reach you about your listings. It stays private and is
          never shown publicly.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-600/30 bg-red-600/10 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
            Mobile number
            <div className="flex items-center gap-2">
              <span className="input flex shrink-0 items-center px-3 text-[var(--muted)]">+91</span>
              <input
                name="phone"
                type="tel"
                required
                autoFocus
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                className="input flex-1"
                placeholder="10-digit mobile number"
              />
            </div>
          </label>
          <button type="submit" disabled={busy} className="btn-primary mt-1 py-3">
            {busy ? "Saving…" : "Save & continue"}
          </button>
        </form>

        <Link href={next} className="mt-4 block text-center text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          Skip for now
        </Link>
      </div>
    </div>
  );
}
