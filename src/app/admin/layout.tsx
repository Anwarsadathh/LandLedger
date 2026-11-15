import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { MODERATOR_ROLES, hasRole } from "@/server/auth/roles";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.role, MODERATOR_ROLES)) redirect("/");

  return (
    <div className="flex flex-col gap-5 md:flex-row md:gap-6">
      <AdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
