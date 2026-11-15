"use client";

import { useCallback, useEffect, useState } from "react";

type AdminUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  authProvider: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  avatarUrl: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
};

function roleBadge(role: string): string {
  const map: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
    MODERATOR: "bg-indigo-100 text-indigo-700 border-indigo-200",
    REVIEWER: "bg-blue-100 text-blue-700 border-blue-200",
    BROKER: "bg-amber-100 text-amber-700 border-amber-200",
    AUTHORISED_REP: "bg-teal-100 text-teal-700 border-teal-200",
    OWNER: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return map[role] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

const prettyRole = (r: string) => r.replace(/_/g, " ").toLowerCase();

async function fetchUsers(): Promise<{ users: AdminUser[]; byRole: Record<string, number>; total: number }> {
  const res = await fetch("/api/v1/admin/users", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Failed to load users");
  return json.data;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [byRole, setByRole] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const applyData = useCallback((d: { users: AdminUser[]; byRole: Record<string, number>; total: number }) => {
    setUsers(d.users ?? []);
    setByRole(d.byRole ?? {});
    setTotal(d.total ?? 0);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applyData(await fetchUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const d = await fetchUsers();
        if (active) applyData(d);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load users");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applyData]);

  const filtered = users.filter((u) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      u.name.toLowerCase().includes(s) ||
      (u.email ?? "").toLowerCase().includes(s) ||
      (u.phone ?? "").includes(s)
    );
  });

  const roleTiles = Object.entries(byRole).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Everyone registered on OROVA.</p>
        </div>
        <button onClick={load} className="btn-ghost shrink-0">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-2xl font-semibold tabular-nums">{loading ? "—" : total}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Total users</p>
        </div>
        {roleTiles.map(([role, count]) => (
          <div key={role} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-2xl font-semibold tabular-nums">{count}</p>
            <p className="mt-0.5 text-xs capitalize text-[var(--muted)]">{prettyRole(role)}</p>
          </div>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, email or phone"
        className="input w-full sm:max-w-sm"
      />

      {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          No users found.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((u) => (
          <UserRow key={u.id} user={u} />
        ))}
      </div>
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;
  const joined = fmt(user.createdAt) ?? "—";
  const last = fmt(user.lastLoginAt);
  const initial = user.name.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 sm:flex-nowrap">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--foreground)] text-sm font-semibold text-white">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{user.name}</span>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize ${roleBadge(user.role)}`}>
            {prettyRole(user.role)}
          </span>
          {user.status !== "ACTIVE" && (
            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs capitalize text-red-700">
              {user.status.toLowerCase()}
            </span>
          )}
          {user.emailVerified && <VerifiedTag label="email" />}
          {user.phoneVerified && <VerifiedTag label="phone" />}
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
          {user.email ?? "no email"}
          {user.phone ? ` · ${user.phone}` : ""} · via {user.authProvider}
        </p>
      </div>
      <div className="w-full text-xs text-[var(--muted)] sm:w-auto sm:text-right">
        <p>Joined {joined}</p>
        {last && <p>Last seen {last}</p>}
      </div>
    </div>
  );
}

function VerifiedTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {label}
    </span>
  );
}
