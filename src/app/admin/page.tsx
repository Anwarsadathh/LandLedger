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
    { label: "Listings", value: stats.total, href: "/admin/listings", icon: <IconList /> },
    { label: "Published", value: stats.counts.PUBLISHED ?? 0, href: "/admin/listings", icon: <IconCheck /> },
    { label: "Pending review", value: stats.pending, href: "/admin/review", icon: <IconClock />, alert: stats.pending > 0 },
    { label: "Enquiries", value: eStats.total, href: "/admin/enquiries", icon: <IconInbox /> },
    { label: "Users", value: userCount, href: "/admin/users", icon: <IconUsers /> },
  ];

  const statusRows = STATUS_ORDER.map((s) => ({ s, n: stats.counts[s] ?? 0 })).filter((r) => r.n > 0);
  const maxN = Math.max(1, ...statusRows.map((r) => r.n));

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Listings, review workload, leads and users at a glance.</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`group flex flex-col rounded-2xl border bg-[var(--card)] p-3.5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 ${
              t.alert ? "border-[var(--accent)]/50" : "border-[var(--border)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  t.alert ? "bg-[var(--accent)] text-white" : "bg-[var(--accent-soft)] text-[var(--accent)]"
                }`}
              >
                {t.icon}
              </span>
            </div>
            <p className={`mt-3 text-2xl font-bold tabular-nums leading-none ${t.alert ? "text-[var(--accent)]" : ""}`}>
              {t.value}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{t.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        {/* Listings by status */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold sm:text-base">Listings by status</h2>
            <Link href="/admin/listings" className="shrink-0 text-xs font-medium text-[var(--accent)] hover:underline">
              Manage →
            </Link>
          </div>
          {statusRows.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No listings yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {statusRows.map(({ s, n }) => (
                <div key={s} className="flex items-center gap-2.5 text-sm sm:gap-3">
                  <span className="w-24 shrink-0 truncate text-xs text-[var(--muted)] sm:w-32 sm:text-sm">
                    {STATUS_LABELS[s] ?? s}
                  </span>
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--background)]">
                    <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${(n / maxN) * 100}%` }} />
                  </span>
                  <span className="w-7 shrink-0 text-right text-sm font-semibold tabular-nums">{n}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent enquiries */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold sm:text-base">Recent enquiries</h2>
            <Link href="/admin/enquiries" className="shrink-0 text-xs font-medium text-[var(--accent)] hover:underline">
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
                      {e.phone}
                      {e.listingTitle ? ` · ${e.listingTitle}` : ""}
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

/* ---------- icons ---------- */
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
function IconList() {
  return (
    <Svg>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3.5" cy="6" r="1" />
      <circle cx="3.5" cy="12" r="1" />
      <circle cx="3.5" cy="18" r="1" />
    </Svg>
  );
}
function IconCheck() {
  return (
    <Svg>
      <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
      <path d="M22 4 12 14.01l-3-3" />
    </Svg>
  );
}
function IconClock() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}
function IconInbox() {
  return (
    <Svg>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" />
    </Svg>
  );
}
function IconUsers() {
  return (
    <Svg>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}
