"use client";

import { useState } from "react";

// Turn a stored phone into wa.me (digits, country code) + tel (with +) forms.
// Assumes India when a bare 10-digit number is stored.
function phoneForms(raw: string): { wa: string; tel: string } {
  const digits = raw.replace(/\D/g, "");
  const wa = digits.length === 10 ? `91${digits}` : digits;
  return { wa, tel: `+${wa}` };
}

export function OwnerContactActions({
  listingId,
  listingTitle,
  contact,
  raterPhone,
}: {
  listingId: string;
  listingTitle: string;
  contact: { name: string | null; phone: string };
  raterPhone: string;
}) {
  const { wa, tel } = phoneForms(contact.phone);
  const waText = encodeURIComponent(`Hi${contact.name ? ` ${contact.name}` : ""}, I'm interested in your OROVA listing: ${listingTitle}`);

  const [copied, setCopied] = useState(false);

  // Rating state
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [rateState, setRateState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = { title: listingTitle, text: `Check out this property on OROVA: ${listingTitle}`, url };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch {
      return; // user dismissed the share sheet
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked */
    }
  }

  async function submitRating() {
    if (stars < 1 || rateState === "sending") return;
    setRateState("sending");
    try {
      const res = await fetch(`/api/v1/listings/${listingId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, phone: raterPhone, comment: comment.trim() || undefined }),
      });
      setRateState(res.ok ? "done" : "error");
    } catch {
      setRateState("error");
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-green-600/40 bg-green-600/10 p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Enquiry sent{contact.name ? ` — reach ${contact.name}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          The team may also follow up. You can contact the owner directly below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a href={`tel:${tel}`} className="btn-accent justify-center py-2.5 text-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
          </svg>
          Call
        </a>
        <a
          href={`https://wa.me/${wa}?text=${waText}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.1.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.1.3.6 1.1 1.4 1.8 1 .9 1.8 1.1 2.1 1.3.3.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.5.3.1.3.1.6-.1 1.1Z" /></svg>
          WhatsApp
        </a>
      </div>

      <button
        type="button"
        onClick={share}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        {copied ? "Link copied" : "Share listing"}
      </button>

      {/* Rate the owner (post-interaction) */}
      <div className="border-t border-green-600/30 pt-3">
        {rateState === "done" ? (
          <p className="text-sm text-[var(--foreground)]">Thanks for rating this owner.</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-[var(--foreground)]">Rate this owner</p>
            <p className="mb-2 text-xs text-[var(--muted)]">Was your experience fair and transparent?</p>
            <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHover(n)}
                  className="p-0.5"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill={(hover || stars) >= n ? "#e0813f" : "none"} stroke="#e0813f" strokeWidth={1.5} strokeLinejoin="round">
                    <path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
                  </svg>
                </button>
              ))}
            </div>
            {stars > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Add a short note (optional)"
                  className="input text-sm"
                />
                <button type="button" onClick={submitRating} disabled={rateState === "sending"} className="btn-primary justify-center py-2 text-sm">
                  {rateState === "sending" ? "Submitting…" : "Submit rating"}
                </button>
                {rateState === "error" && <p className="text-xs text-red-500">Couldn&apos;t save your rating. Please try again.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
