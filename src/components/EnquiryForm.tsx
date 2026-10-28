"use client";

import { useState } from "react";
import { CONSENT_NOTICE_VERSION } from "@/lib/consent";
import { OwnerContactActions } from "@/components/OwnerContactActions";
import { useT } from "@/components/i18n/LanguageProvider";

type Contact = { name: string | null; phone: string };

export function EnquiryForm({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [raterPhone, setRaterPhone] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setNote(null);
    const f = new FormData(e.currentTarget);
    const phone = (f.get("phone") as string)?.trim();
    setRaterPhone(phone);

    const payload = {
      name: (f.get("name") as string)?.trim(),
      phone,
      email: (f.get("email") as string)?.trim() || undefined,
      message: (f.get("message") as string)?.trim() || undefined,
      consent: { accepted: f.get("consent") === "on", noticeVersion: CONSENT_NOTICE_VERSION },
      source: { channel: "WEB" },
    };

    try {
      const res = await fetch(`/api/v1/listings/${listingId}/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setState("error");
        setNote(json.error?.details?.[0]?.issue ?? json.error?.message ?? t("enquiry.errorGeneric"));
        return;
      }
      setState("done");
      setContact(json.data.contact ?? null);
      setNote(json.data.duplicate ? t("enquiry.duplicate") : t("enquiry.sent"));
    } catch {
      setState("error");
      setNote(t("enquiry.network"));
    }
  }

  if (state === "done") {
    if (contact) {
      return (
        <OwnerContactActions
          listingId={listingId}
          listingTitle={listingTitle}
          contact={contact}
          raterPhone={raterPhone}
        />
      );
    }
    return (
      <div className="rounded-xl border border-green-600/40 bg-green-600/10 p-4 text-sm">{note}</div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <h3 className="font-medium">{t("enquiry.title")}</h3>
      {state === "error" && <p className="text-sm text-red-500">{note}</p>}
      <input name="name" required placeholder={t("enquiry.name")} className="input" />
      <input name="phone" required placeholder={t("enquiry.phone")} className="input" />
      <input name="email" type="email" placeholder={t("enquiry.email")} className="input" />
      <textarea name="message" rows={3} placeholder={t("enquiry.message")} className="input" />
      <label className="flex items-start gap-2 text-xs text-[var(--muted)]">
        <input name="consent" type="checkbox" required className="mt-0.5 h-4 w-4" />
        <span>{t("enquiry.consent").replace("{v}", CONSENT_NOTICE_VERSION)}</span>
      </label>
      <button type="submit" disabled={state === "sending"} className="btn-primary">
        {state === "sending" ? t("enquiry.sending") : t("enquiry.send")}
      </button>
    </form>
  );
}
