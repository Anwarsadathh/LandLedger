"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Keep this shape in sync with AssistantListing in src/server/ai/assistant.ts.
// Declared locally so the client bundle never imports the server module.
type AssistantListing = {
  slug: string;
  title: string;
  typeLabel: string;
  priceText: string;
  areaText: string;
  locationText: string;
  image: string | null;
  url: string;
};

type Msg = { role: "user" | "assistant"; content: string; listings?: AssistantListing[] };

const SUGGESTIONS = [
  "Plots in Karnataka under ₹50 lakh",
  "How do I list my property?",
  "How does OROVA work?",
];

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Keep the newest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Focus the box when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || sending) return;
    const next: Msg[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/v1/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          json?.error?.message ?? "Something went wrong. Please try again in a moment.";
        setMessages((m) => [...m, { role: "assistant", content: msg }]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: json.data.reply, listings: json.data.listings ?? [] },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network hiccup — please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the OROVA assistant"
          className="btn-accent fixed bottom-5 right-5 z-50 gap-2 rounded-full py-3 pl-4 pr-5 shadow-lg shadow-black/10"
        >
          <SparkIcon />
          <span className="text-sm font-semibold">Ask OROVA</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="OROVA assistant"
          className="fixed bottom-0 right-0 z-50 flex h-[85vh] w-full flex-col overflow-hidden bg-[var(--card)] shadow-2xl sm:bottom-5 sm:right-5 sm:h-[34rem] sm:w-[23rem] sm:rounded-3xl sm:border sm:border-[var(--border)]"
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 bg-[#1b1813] px-4 py-3 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]">
              <SparkIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
                OROVA Assistant
                <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                  Beta
                </span>
              </p>
              <p className="text-[11px] leading-tight text-white/60">Finds listings · explains how it works</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-2xl rounded-tl-sm bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--foreground)]">
                  Hi! I can help you find land &amp; property on OROVA, or explain how listing and
                  enquiries work. What are you looking for?
                </div>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[var(--accent)] px-3.5 py-2.5 text-sm text-white">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="space-y-2">
                  <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--foreground)]">
                    {m.content}
                  </div>
                  {m.listings && m.listings.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {m.listings.map((l) => (
                        <ListingChip key={l.slug} listing={l} onNavigate={() => setOpen(false)} />
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}

            {sending && (
              <div className="flex items-center gap-1.5 px-1 text-[var(--muted)]">
                <Dot /> <Dot style={{ animationDelay: "0.15s" }} /> <Dot style={{ animationDelay: "0.3s" }} />
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-[var(--border)] bg-[var(--card)] px-3 pb-3 pt-2.5">
            <div className="flex items-end gap-2 rounded-2xl bg-[var(--background)] px-3 py-1.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                maxLength={4000}
                placeholder="Ask about listings, prices, how to list…"
                className="max-h-24 flex-1 resize-none bg-transparent py-1.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
              />
              <button
                type="button"
                onClick={() => send(input)}
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] leading-tight text-[var(--muted)]">
              Beta — can make mistakes. Listings aren&apos;t legally verified; always check the listing.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function ListingChip({ listing, onNavigate }: { listing: AssistantListing; onNavigate: () => void }) {
  return (
    <Link
      href={listing.url}
      onClick={onNavigate}
      className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 transition hover:border-[var(--accent)]"
    >
      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--background)]">
        {listing.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[var(--muted)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /></svg>
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-sm font-semibold text-[var(--foreground)]">{listing.title}</span>
        <span className="mt-0.5 block text-sm font-bold text-[var(--accent)]">{listing.priceText}</span>
        <span className="line-clamp-1 text-[11px] text-[var(--muted)]">{listing.locationText || listing.typeLabel}</span>
      </span>
    </Link>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z" />
      <path d="M19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z" opacity=".7" />
    </svg>
  );
}

function Dot({ style }: { style?: React.CSSProperties }) {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={style} />;
}
