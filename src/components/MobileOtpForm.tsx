"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { firebaseEnabled, getFirebaseAuth } from "@/lib/firebase-client";
import type { Role } from "@/server/auth/roles";

const ADMINISH: Role[] = ["ADMIN", "SUPER_ADMIN", "LISTING_REVIEWER"];

function fbError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("invalid-phone-number")) return "That doesn’t look like a valid number.";
  if (code.includes("too-many-requests")) return "Too many attempts — please try again later.";
  if (code.includes("quota-exceeded")) return "SMS limit reached. Please sign up with email for now.";
  if (code.includes("invalid-verification-code")) return "That code is incorrect.";
  if (code.includes("code-expired")) return "That code expired — request a new one.";
  if (code.includes("billing-not-enabled")) return "Firebase needs the Blaze plan for SMS. Upgrade the Firebase project, then retry.";
  if (code.includes("operation-not-allowed")) return "Phone sign-in isn’t enabled in Firebase (Authentication → Sign-in method → Phone).";
  if (code.includes("captcha") || code.includes("invalid-app-credential")) return "reCAPTCHA check failed — check Firebase authorized domains.";
  return `Couldn’t send the code${code ? ` (${code})` : ""}. Please try again.`;
}

export function MobileOtpForm({ bare = false, onBack }: { bare?: boolean; onBack?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState(false);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmRef = useRef<ConfirmationResult | null>(null);

  function resetRecaptcha() {
    try {
      recaptchaRef.current?.clear();
    } catch {
      /* ignore */
    }
    recaptchaRef.current = null;
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (firebaseEnabled) {
        // Layer A gate (our cap) before Firebase sends the SMS.
        const pre = await fetch("/api/v1/auth/otp/precheck", { method: "POST" });
        if (!pre.ok) {
          const j = await pre.json().catch(() => ({}));
          setError(j.error?.message ?? "Mobile verification is unavailable right now.");
          setBusy(false);
          return;
        }
        const auth = getFirebaseAuth();
        if (!recaptchaRef.current) {
          recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
        }
        confirmRef.current = await signInWithPhoneNumber(auth, `+91${phone}`, recaptchaRef.current);
        setStep("code");
        setBusy(false);
        return;
      }

      // Fallback: our own API (Twilio / SmsLocal / dev-console).
      const res = await fetch("/api/v1/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name: name || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.details?.[0]?.issue ?? json.error?.message ?? "Couldn’t send the code.");
        setBusy(false);
        return;
      }
      setDevHint(Boolean(json.data?.dev));
      setStep("code");
      setBusy(false);
    } catch (err) {
      resetRecaptcha();
      setError(firebaseEnabled ? fbError(err) : "Network error. Please try again.");
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let idToken: string | null = null;
      if (firebaseEnabled) {
        if (!confirmRef.current) {
          setError("Please request a code first.");
          setBusy(false);
          return;
        }
        const cred = await confirmRef.current.confirm(code);
        idToken = await cred.user.getIdToken();
      }

      const url = firebaseEnabled ? "/api/v1/auth/firebase" : "/api/v1/auth/otp/verify";
      const body = firebaseEnabled
        ? { idToken, name: name || undefined }
        : { phone, code, name: name || undefined };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.details?.[0]?.issue ?? json.error?.message ?? "Invalid code.");
        setBusy(false);
        return;
      }
      const role = json.data.role as Role;
      router.push(next ?? (ADMINISH.includes(role) ? "/admin" : "/dashboard"));
      router.refresh();
    } catch (err) {
      setError(firebaseEnabled ? fbError(err) : "Network error. Please try again.");
      setBusy(false);
    }
  }

  const content = (
    <>
      {!bare && (
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <rect x="7" y="3" width="10" height="18" rx="2.5" />
            <path d="M11 18h2" />
          </svg>
        </span>
      )}
      <h2 className={`${bare ? "text-lg" : "mt-4 text-2xl"} font-bold tracking-tight`}>
        {step === "phone" ? "Continue with mobile" : "Enter the code"}
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {step === "phone" ? "We’ll send a one-time code to verify your number." : `Sent to +91 ${phone}.`}
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-600/30 bg-red-600/10 p-3 text-sm text-red-700">{error}</div>
      )}
      {step === "code" && devHint && (
        <div className="mt-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-3 text-xs text-[var(--foreground)]/90">
          Dev mode: no real message was sent — your code was printed in the server terminal.
        </div>
      )}

      {step === "phone" ? (
        <form onSubmit={sendCode} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
            Your name <span className="font-normal">(optional)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Your name" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
            Mobile number
            <div className="flex items-center gap-2">
              <span className="input flex shrink-0 items-center px-3 text-[var(--muted)]">+91</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                type="tel"
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                className="input flex-1"
                placeholder="10-digit mobile number"
              />
            </div>
          </label>
          <button type="submit" disabled={busy || phone.length !== 10} className="btn-primary mt-1 py-3">
            {busy ? "Sending…" : "Send code"}
          </button>
          {bare && onBack && (
            <button type="button" onClick={onBack} className="text-center text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
              Use another sign-up method
            </button>
          )}
        </form>
      ) : (
        <form onSubmit={verify} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
            One-time code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              autoFocus
              required
              className="input tracking-[0.5em]"
              placeholder="______"
            />
          </label>
          <button type="submit" disabled={busy || code.length < 4} className="btn-primary mt-1 py-3">
            {busy ? "Verifying…" : "Verify & continue"}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
                confirmRef.current = null;
              }}
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Change number
            </button>
            <button type="button" onClick={sendCode} disabled={busy} className="font-medium text-[var(--accent)] hover:underline disabled:opacity-50">
              Resend code
            </button>
          </div>
        </form>
      )}

      {/* invisible reCAPTCHA target for Firebase phone auth */}
      <div id="recaptcha-container" />

      {!bare && (
        <div className="mt-6 border-t border-[var(--border)] pt-4 text-center text-sm text-[var(--muted)]">
          Prefer email?{" "}
          <Link href={`/signin${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-[var(--accent)] hover:underline">
            Sign in with email
          </Link>
        </div>
      )}
    </>
  );

  if (bare) return <div className="mt-5">{content}</div>;

  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="card p-6 sm:p-8">{content}</div>
    </div>
  );
}
