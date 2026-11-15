"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LEAD_STATUSES } from "@/server/domain/enums";

type AdminEnquiry = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  status: string;
  channel: string;
  listingId: string;
  listingTitle: string | null;
  listingSlug: string | null;
  createdAt: string | null;
};

const LEAD_LABELS: Record<string, string> = {
  NEW: "New",
  ATTEMPTING_CONTACT: "Attempting contact",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  NURTURE: "Nurture",
  SITE_VISIT_BOOKED: "Visit booked",
  SITE_VISIT_DONE: "Visit done",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  DISQUALIFIED: "Disqualified",
};

const leadLabel = (s: string) => LEAD_LABELS[s] ?? s;

function statusBadge(s: string): string {
  if (s === "WON") return "bg-green-100 text-green-700 border-green-200";
  if (s === "LOST" || s === "DISQUALIFIED") return "bg-red-100 text-red-700 border-red-200";
  if (s === "NEW") return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-amber-100 text-amber-700 border-amber-200"; // in-progress
}

const TAB_KEYS = ["", "NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "WON", "LOST"];

async function fetchEnquiries(status: string) {
  const qs = status ? `?status=${status}` : "";
  const res = await fetch(`/api/v1/admin/enquiries${qs}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Failed to load enquiries");
  return json.data as { items: AdminEnquiry[]; total: number; byStatus: Record<string, number> };
}

export default function AdminEnquiriesPage() {
  const [tab, setTab] = useState("");
  const [items, setItems] = useState<AdminEnquiry[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((d: { items: AdminEnquiry[]; total: number; byStatus: Record<string, number> }) => {
    setItems(d.items ?? []);
    setByStatus(d.byStatus ?? {});
    setTotal(d.total ?? 0);
  }, []);

  // Await before any setState so the effect never sets state synchronously.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const d = await fetchEnquiries(tab);
        if (active) {
          apply(d);
          setError(null);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load enquiries");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tab, apply]);

  function onStatusChanged(id: string, status: string) {
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Enquiries</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Leads from buyers — move each one through the pipeline.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-semibold tabular-nums">{loading ? "—" : total}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Total enquiries</p>
        </div>
        {(["NEW", "CONTACTED", "WON", "LOST"] as const).map((s) => (
          <div key={s} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-2xl font-semibold tabular-nums">{byStatus[s] ?? 0}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{leadLabel(s)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        {TAB_KEYS.map((k) => (
          <button
            key={k || "all"}
            onClick={() => {
              if (k !== tab) {
                setLoading(true);
                setTab(k);
              }
            }}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              tab === k
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
            }`}
          >
            {k ? leadLabel(k) : "All"}
            {k && byStatus[k] !== undefined ? <span className="ml-1 opacity-70">({byStatus[k]})</span> : null}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          No enquiries in this view.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.map((e) => (
          <EnquiryRow key={e.id} enquiry={e} onChanged={onStatusChanged} />
        ))}
      </div>
    </div>
  );
}

function EnquiryRow({ enquiry, onChanged }: { enquiry: AdminEnquiry; onChanged: (id: string, status: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const when = enquiry.createdAt
    ? new Date(enquiry.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "—";

  async function setStatus(status: string) {
    setBusy(true);
    setErr(null);
    const prev = enquiry.status;
    onChanged(enquiry.id, status); // optimistic
    try {
      const res = await fetch(`/api/v1/admin/enquiries/${enquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? "Update failed");
      }
    } catch (e) {
      onChanged(enquiry.id, prev); // revert
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{enquiry.name}</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusBadge(enquiry.status)}`}>
              {leadLabel(enquiry.status)}
            </span>
            <span className="text-xs text-[var(--muted)]">{when}</span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-[var(--muted)]">
            <a href={`tel:${enquiry.phone}`} className="text-[var(--foreground)] hover:text-[var(--accent)]">
              {enquiry.phone}
            </a>
            {enquiry.email && <span>{enquiry.email}</span>}
            <a
              href={`https://wa.me/${enquiry.phone.replace(/\D/g, "").replace(/^0+/, "")}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#25D366] hover:underline"
            >
              WhatsApp
            </a>
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Listing:{" "}
            {enquiry.listingSlug ? (
              <Link href={`/listings/${enquiry.listingSlug}`} className="text-[var(--accent)] hover:underline">
                {enquiry.listingTitle ?? enquiry.listingSlug}
              </Link>
            ) : (
              enquiry.listingTitle ?? enquiry.listingId
            )}
          </p>
          {enquiry.message && <p className="mt-2 whitespace-pre-line rounded-lg bg-[var(--background)] p-2.5 text-sm">{enquiry.message}</p>}
          {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
        </div>

        <label className="flex shrink-0 flex-col gap-1 text-xs text-[var(--muted)]">
          Status
          <select
            value={enquiry.status}
            disabled={busy}
            onChange={(e) => setStatus(e.target.value)}
            className="input py-1.5 text-sm"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {leadLabel(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
