"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { STATUS_LABELS, formatArea, formatPrice, stateLabel } from "@/lib/format";

type Media = { url: string; type: "PHOTO" | "VIDEO" };
type ReviewEvent = { from?: string; to: string; actorRole?: string; reason?: string; at?: string };

type AdminListing = {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  listingType: string;
  assetSubtype: string | null;
  transactionType: string;
  description: string | null;
  price: { min: number; max?: number | null; currency: string; basis: string; negotiable?: boolean };
  area: { value: number; unit: string; normalizedSqFt?: number | null };
  location: {
    state: string;
    district: string;
    subDistrict?: string | null;
    locality?: string | null;
    latitude: number;
    longitude: number;
    pinPrecision: string;
  };
  features?: {
    facing?: string;
    roadAccess?: string;
    roadWidth?: string;
    possessionStatus?: string;
    nearbyLandmarks?: string;
    landUseClaim?: string;
  } | null;
  media: Media[];
  ownerContact?: { name?: string; phone?: string; email?: string };
  submitterRole?: string;
  landIdentifiers?: { identifierType: string; identifierValue: string }[];
  reviewHistory?: ReviewEvent[];
};

type Stats = { total: number; counts: Record<string, number>; enquiries: number; pending: number };

const TABS = [
  { key: "", label: "All" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "APPROVED_TO_PUBLISH", label: "Approved" },
  { key: "NEEDS_CORRECTION", label: "Needs fix" },
  { key: "PUBLISHED", label: "Published" },
  { key: "PAUSED", label: "Paused" },
  { key: "REJECTED", label: "Rejected" },
  { key: "DRAFT", label: "Drafts" },
];

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    PUBLISHED: "bg-green-100 text-green-700 border-green-200",
    PAUSED: "bg-amber-100 text-amber-700 border-amber-200",
    SUBMITTED: "bg-blue-100 text-blue-700 border-blue-200",
    APPROVED_TO_PUBLISH: "bg-indigo-100 text-indigo-700 border-indigo-200",
    NEEDS_CORRECTION: "bg-amber-100 text-amber-700 border-amber-200",
    REJECTED: "bg-red-100 text-red-700 border-red-200",
    WITHDRAWN: "bg-slate-100 text-slate-600 border-slate-200",
    DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("");
  const [items, setItems] = useState<AdminListing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async (status: string): Promise<AdminListing[]> => {
    const qs = status ? `?status=${status}` : "";
    const res = await fetch(`/api/v1/admin/listings${qs}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? "Failed to load");
    return json.data.items;
  }, []);

  const reload = useCallback(
    async (status: string) => {
      setLoading(true);
      setError(null);
      try {
        const [list, statsRes] = await Promise.all([
          fetchListings(status),
          fetch("/api/v1/admin/stats", { cache: "no-store" }).then((r) => r.json()),
        ]);
        setItems(list);
        if (statsRes.data) setStats(statsRes.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [fetchListings],
  );

  useEffect(() => {
    let active = true;
    fetchListings(tab)
      .then((list) => active && setItems(list))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => active && setLoading(false));
    fetch("/api/v1/admin/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => active && j.data && setStats(j.data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [tab, fetchListings]);

  const tiles = stats
    ? [
        { label: "Total listings", value: stats.total },
        { label: "Published", value: stats.counts.PUBLISHED ?? 0 },
        { label: "Pending review", value: stats.pending },
        { label: "Paused", value: stats.counts.PAUSED ?? 0 },
        { label: "Enquiries", value: stats.enquiries },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Moderate, pause, edit and remove listings. Every action is audited.
          </p>
        </div>
        <button onClick={() => reload(tab)} className="btn-ghost">
          Refresh
        </button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(tiles.length ? tiles : Array.from({ length: 5 }, (_, i) => ({ label: "", value: i }))).map(
          (t, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-2xl font-semibold tabular-nums">{stats ? t.value : "—"}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{t.label || "…"}</p>
            </div>
          ),
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        {TABS.map((t) => {
          const count = t.key ? stats?.counts[t.key] : stats?.total;
          return (
            <button
              key={t.key || "all"}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                tab === t.key
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted)] hover:bg-blue-50 hover:text-[var(--foreground)]"
              }`}
            >
              {t.label}
              {stats && count !== undefined ? <span className="ml-1 opacity-70">({count})</span> : null}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          No listings in this view.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <AdminRow key={item.id} item={item} onChanged={() => reload(tab)} badge={statusBadge(item.status)} />
        ))}
      </div>
    </div>
  );
}

function AdminRow({
  item,
  onChanged,
  badge,
}: {
  item: AdminListing;
  onChanged: () => void;
  badge: string;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function decide(decision: string) {
    if ((decision === "REJECT" || decision === "REQUEST_CORRECTION") && !reason.trim()) {
      setErr("A reason is required for this action.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/v1/admin/listings/${item.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Action failed");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/v1/admin/listings/${item.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Delete failed");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  }

  const s = item.status;
  const needsReason = s === "SUBMITTED" || s === "APPROVED_TO_PUBLISH";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex gap-4">
        <Thumb media={item.media} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.status === "PUBLISHED" && item.slug ? (
              <Link href={`/listings/${item.slug}`} className="font-medium hover:text-[var(--primary)]">
                {item.title}
              </Link>
            ) : (
              <span className="font-medium">{item.title}</span>
            )}
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${badge}`}>
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
            <span className="text-xs text-[var(--muted)]">{item.assetSubtype ?? item.listingType}</span>
          </div>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {item.location.locality ? `${item.location.locality}, ` : ""}
            {item.location.district}, {stateLabel(item.location.state)} · {formatPrice(item.price)} ·{" "}
            {formatArea(item.area)}
          </p>
          {item.ownerContact?.phone && (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Private: {item.ownerContact.name ?? "—"} · {item.ownerContact.phone}
              {item.ownerContact.email ? ` · ${item.ownerContact.email}` : ""}
            </p>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 text-xs font-medium text-[var(--primary)] hover:underline"
          >
            {expanded ? "Hide details ▲" : `Show details${item.media.length ? ` · ${item.media.length} media` : ""} ▾`}
          </button>
        </div>
      </div>

      {expanded && <DetailPanel item={item} />}

      {err && <p className="mt-2 text-sm text-red-500">{err}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {s === "SUBMITTED" && (
          <button onClick={() => decide("APPROVE")} disabled={busy} className="btn-primary">
            Approve
          </button>
        )}
        {s === "APPROVED_TO_PUBLISH" && (
          <button onClick={() => decide("PUBLISH")} disabled={busy} className="btn-primary">
            Publish
          </button>
        )}
        {s === "PUBLISHED" && (
          <button onClick={() => decide("PAUSE")} disabled={busy} className="btn-ghost">
            Pause
          </button>
        )}
        {s === "PAUSED" && (
          <button onClick={() => decide("UNPAUSE")} disabled={busy} className="btn-primary">
            Unpause
          </button>
        )}
        {(s === "SUBMITTED" || s === "APPROVED_TO_PUBLISH") && (
          <>
            <button onClick={() => decide("REQUEST_CORRECTION")} disabled={busy} className="btn-ghost">
              Request fix
            </button>
            <button onClick={() => decide("REJECT")} disabled={busy} className="btn-ghost">
              Reject
            </button>
          </>
        )}

        <Link href={`/admin/listings/${item.id}/edit`} className="btn-ghost">
          Edit
        </Link>

        {confirmDelete ? (
          <>
            <button onClick={remove} disabled={busy} className="btn-ghost text-red-600">
              Confirm delete
            </button>
            <button onClick={() => setConfirmDelete(false)} disabled={busy} className="btn-ghost">
              Cancel
            </button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete(true)} disabled={busy} className="btn-ghost text-red-600">
            Delete
          </button>
        )}

        {needsReason && (
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (to reject / request fix)"
            className="input min-w-[200px] flex-1"
          />
        )}
      </div>
    </div>
  );
}

const human = (v?: string | null) => (!v || v === "UNKNOWN" ? undefined : v.replace(/_/g, " ").toLowerCase());

function Thumb({ media }: { media: Media[] }) {
  const cover = media.find((m) => m.type === "PHOTO") ?? media[0];
  return (
    <div className="hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] sm:block">
      {cover ? (
        cover.type === "VIDEO" ? (
          <video src={cover.url} className="h-full w-full object-cover" muted />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt="" className="h-full w-full object-cover" />
        )
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-[var(--muted)]">No media</div>
      )}
    </div>
  );
}

function DetailPanel({ item }: { item: AdminListing }) {
  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      {item.media.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {item.media.map((m, i) =>
            m.type === "VIDEO" ? (
              <video key={i} src={m.url} controls className="aspect-square w-full rounded-lg object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={m.url} alt={`media ${i + 1}`} className="aspect-square w-full rounded-lg object-cover" />
            ),
          )}
        </div>
      )}

      {item.description && <p className="mb-3 whitespace-pre-line text-sm">{item.description}</p>}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        <Fact label="Transaction" value={item.transactionType === "SALE" ? "Sale" : "Lease"} />
        <Fact label="Facing" value={human(item.features?.facing)} />
        <Fact label="Road access" value={human(item.features?.roadAccess)} />
        <Fact label="Road width" value={item.features?.roadWidth || undefined} />
        <Fact label="Possession" value={item.features?.possessionStatus || undefined} />
        <Fact label="Landmarks" value={item.features?.nearbyLandmarks || undefined} />
        <Fact label="Land use" value={item.features?.landUseClaim || undefined} />
        <Fact label="Coordinates" value={`${item.location.latitude}, ${item.location.longitude}`} />
        <Fact label="Pin" value={human(item.location.pinPrecision)} />
        <Fact label="Submitter" value={human(item.submitterRole)} />
      </div>

      {item.landIdentifiers && item.landIdentifiers.length > 0 && (
        <div className="mt-3 text-xs">
          <p className="font-medium">Land identifiers</p>
          <ul className="mt-1 text-[var(--muted)]">
            {item.landIdentifiers.map((id, i) => (
              <li key={i}>
                {id.identifierType}: {id.identifierValue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.reviewHistory && item.reviewHistory.length > 0 && (
        <div className="mt-3 text-xs">
          <p className="font-medium">History</p>
          <ul className="mt-1 space-y-0.5 text-[var(--muted)]">
            {item.reviewHistory.map((h, i) => (
              <li key={i}>
                {h.from ? `${h.from} → ` : ""}
                {h.to}
                {h.actorRole ? ` · ${h.actorRole}` : ""}
                {h.reason ? ` — ${h.reason}` : ""}
                {h.at ? ` · ${new Date(h.at).toLocaleString()}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="text-xs">
      <span className="text-[var(--muted)]">{label}: </span>
      <span>{value}</span>
    </div>
  );
}
