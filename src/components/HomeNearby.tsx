"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOC_COOKIE } from "@/lib/location-cookie";

// Inline home-feed location control: when no location is set it offers to detect
// it; once set it shows "near <place>" with a change option. Writing the cookie +
// router.refresh() re-renders the server feed with nearby listings first.
export function HomeNearby({ city, state }: { city?: string; state?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const place = [city, state].filter(Boolean).join(", ");
  const hasLoc = !!place;

  function writeCookie(value: string, maxAge: number) {
    try {
      document.cookie = `${LOC_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
    } catch {
      /* storage blocked */
    }
  }

  function detect() {
    setErr(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErr("Location isn't available on this device.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/v1/geo/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          const j = await res.json();
          const pref = { state: j?.data?.state ?? undefined, city: j?.data?.city ?? undefined };
          if (!pref.state && !pref.city) {
            setErr("Couldn't place your location.");
            return;
          }
          writeCookie(encodeURIComponent(JSON.stringify(pref)), 60 * 60 * 24 * 30);
          router.refresh();
        } catch {
          setErr("Couldn't read your location.");
        } finally {
          setBusy(false);
        }
      },
      () => {
        setBusy(false);
        setErr("Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function clearLoc() {
    writeCookie("", 0);
    router.refresh();
  }

  const Pin = (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );

  if (hasLoc) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm">
        {Pin}
        <span className="text-[var(--foreground)]">
          Showing land near <strong>{place}</strong>
        </span>
        <button onClick={clearLoc} className="ml-auto shrink-0 font-medium text-[var(--accent)] hover:underline">
          Change
        </button>
      </div>
    );
  }

  if (dismissed) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm">
      {Pin}
      <span className="text-[var(--foreground)]">See land near you?</span>
      {err && <span className="text-xs text-[var(--muted)]">· {err}</span>}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button onClick={detect} disabled={busy} className="btn-accent px-4 py-1.5 text-xs disabled:opacity-60">
          {busy ? "Locating…" : "Use my location"}
        </button>
        <button onClick={() => setDismissed(true)} className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
          Not now
        </button>
      </div>
    </div>
  );
}
