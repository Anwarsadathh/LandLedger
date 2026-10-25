"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const DISMISS_KEY = "orova_welcomed";
const HIDE_ON = ["/signin", "/signup", "/mobile-signin", "/complete-profile"];

export function WelcomeModal({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loggedIn) return;
    if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* storage blocked — just show once this session */
    }
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [loggedIn, pathname]);

  function remember() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function dismiss() {
    remember();
    setOpen(false);
  }

  function nearMe() {
    setErr(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErr("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/v1/geo/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          const json = await res.json();
          const p = new URLSearchParams();
          if (json?.data?.state) p.set("state", json.data.state);
          if (json?.data?.city) p.set("city", json.data.city);
          remember();
          setOpen(false);
          router.push(`/map${p.toString() ? `?${p}` : ""}`);
        } catch {
          remember();
          setOpen(false);
          router.push("/map");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setErr("Location permission denied — you can still browse everything.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" onClick={dismiss}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-[var(--card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--background)]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div className="bg-[#1b1813] px-6 pb-8 pt-7 text-center text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/orova-logo-light.svg" alt="OROVA" className="mx-auto h-9 w-auto" />
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Find land &amp; property, honestly.</h2>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-white/70">
            Plots, homes and farmland across India — on a map, human-reviewed, with nothing to hide.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 p-6">
          <a
            href="/api/v1/auth/google"
            className="flex items-center justify-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--card)] py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z" />
              <path fill="#FBBC05" d="M5.27 14.29A7.21 7.21 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09Z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
            </svg>
            Continue with Google
          </a>

          <button
            type="button"
            onClick={nearMe}
            disabled={locating}
            className="btn-accent justify-center py-3"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {locating ? "Finding you…" : "See listings near me"}
          </button>

          {err && <p className="text-center text-xs text-[var(--muted)]">{err}</p>}

          <button
            type="button"
            onClick={dismiss}
            className="mt-1 text-center text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            Browse as guest
          </button>
        </div>
      </div>
    </div>
  );
}
