import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { MODERATOR_ROLES, hasRole } from "@/server/auth/roles";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.role, MODERATOR_ROLES)) redirect("/");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* admin top bar — the panel's own chrome (no public header/footer) */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/admin" className="flex items-center gap-2" aria-label="OROVA admin">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/orova-logo.svg" alt="OROVA" className="h-7 w-auto" />
            <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">Admin</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="hidden text-[var(--muted)] transition hover:text-[var(--foreground)] sm:inline">
              View site ↗
            </Link>
            <span className="hidden font-medium sm:inline">{user.name}</span>
            <SignOutButton className="btn-ghost px-3 py-1.5" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-6 md:flex-row md:gap-6">
        <AdminSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
