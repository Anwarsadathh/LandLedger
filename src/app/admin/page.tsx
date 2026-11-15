import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { adminStats } from "@/server/modules/listings/service";
import { countUsersForAdmin } from "@/server/modules/users/service";
import { enquiryStats, listEnquiriesForAdmin } from "@/server/modules/enquiries/admin";
import { STATUS_LABELS } from "@/lib/format";

export const dynamic = "force-dynamic";

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

const STATUS_ORDER = [
  "PUBLISHED",
  "SUBMITTED",
  "APPROVED_TO_PUBLISH",
  "NEEDS_CORRECTION",
  "PAUSED",
  "DRAFT",
  "REJECTED",
  "WITHDRAWN",
];

function leadBadge(s: string): string {
  if (s === "WON") return "bg-green-100 text-green-700";
  if (s === "LOST" || s === "DISQUALIFIED") return "bg-red-100 text-red-700";
  if (s === "NEW") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout already gated

  const [stats, userCount, eStats, recent] = await Promise.all([
    adminStats(user),
    countUsersForAdmin(user),
    enquiryStats(user),
    listEnquiriesForAdmin(user, { limit: 6 }),
  ]);

  const tiles = [
    { label: "Listings", value: stats.total, href: "/admin/listings" },
    { label: "Published", value: stats.counts.PUBLISHED ?? 0, href: "/admin/listings" },
    { label: "Pending review", value: stats.pending, href: "/admin/review", alert: stats.pending > 0 },
    { label: "Enquiries", value: eStats.total, href: "/admin/enquiries" },
    { label: "Users", value: userCount, href: "/admin/users" },
  ];

  const statusRows = STATUS_ORDER.map((s) => ({ s, n: stats.counts[s] ?? 0 })).filter((r) => r.n > 0);
  const maxN = Math.max(1, ...statusRows.map((r) => r.n));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">An overview of listings, review workload, leads and users.</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`rounded-xl border bg-[var(--card)] p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
              t.alert ? "border-[var(--accent)]/50" : "border-[var(--border)]"
            }`}
          >
            <p className={`text-2xl font-semibold tabular-nums ${t.alert ? "text-[var(--accent)]" : ""}`}>{t.value}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{t.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Listings by status */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Listings by status</h2>
            <Link href="/admin/listings" className="text-xs font-medium text-[var(--accent)] hover:underline">
              Manage →
            </Link>
          </div>
          {statusRows.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No listings yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {statusRows.map(({ s, n }) => (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0 text-[var(--muted)]">{STATUS_LABELS[s] ?? s}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--background)]">
                    <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${(n / maxN) * 100}%` }} />
                  </span>
                  <span className="w-8 shrink-0 text-right font-semibold tabular-nums">{n}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent enquiries */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent enquiries</h2>
            <Link href="/admin/enquiries" className="text-xs font-medium text-[var(--accent)] hover:underline">
              All leads →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No enquiries yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {e.phone} · {e.listingTitle ?? "—"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${leadBadge(e.status)}`}>
                    {LEAD_LABELS[e.status] ?? e.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
