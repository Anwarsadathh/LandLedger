"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true, icon: <IconGrid /> },
  { href: "/admin/listings", label: "Listings", icon: <IconList /> },
  { href: "/admin/review", label: "Review queue", icon: <IconCheck /> },
  { href: "/admin/enquiries", label: "Enquiries", icon: <IconInbox /> },
  { href: "/admin/users", label: "Users", icon: <IconUsers /> },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="md:w-56 md:shrink-0">
      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 md:sticky md:top-20 md:flex-col md:overflow-visible">
        <p className="hidden px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] md:block">
          Admin
        </p>
        {NAV.map((i) => {
          const active = isActive(i.href, i.exact);
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="shrink-0">{i.icon}</span>
              <span className="whitespace-nowrap">{i.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
function IconGrid() {
  return (
    <Svg>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Svg>
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
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
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
