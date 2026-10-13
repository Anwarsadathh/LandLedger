import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { listMine } from "@/server/modules/listings/service";
import { SubmitListingButton } from "@/components/SubmitListingButton";
import { STATUS_LABELS, formatArea, formatPrice, stateLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

const RESUBMITTABLE = new Set(["DRAFT", "NEEDS_CORRECTION"]);

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard"); // middleware also guards

  const listings = await listMine(user.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My listings</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Signed in as <strong>{user.name}</strong>. You only see your own listings here.
          </p>
        </div>
        <Link href="/listings/new" className="btn-primary">
          List a property
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
          <p className="font-medium">You haven&apos;t listed anything yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">
            Create your first listing — it goes to the review team before it appears publicly.
          </p>
          <Link href="/listings/new" className="btn-primary mt-4 inline-flex">
            List a property
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map((l) => {
            const lastReason = [...(l.reviewHistory ?? [])]
              .reverse()
              .find((r) => r.reason)?.reason;
            return (
              <div
                key={l.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {l.status === "PUBLISHED" && l.slug ? (
                        <Link href={`/listings/${l.slug}`} className="font-medium hover:text-[var(--primary)]">
                          {l.title}
                        </Link>
                      ) : (
                        <span className="font-medium">{l.title}</span>
                      )}
                      <span className="badge">{STATUS_LABELS[l.status] ?? l.status}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">
                      {l.location.district}, {stateLabel(l.location.state)} · {formatPrice(l.price)} ·{" "}
                      {formatArea(l.area)}
                    </p>
                    {l.status === "NEEDS_CORRECTION" && lastReason && (
                      <p className="mt-1 text-sm text-amber-600">Reviewer asked: {lastReason}</p>
                    )}
                  </div>
                  {RESUBMITTABLE.has(l.status) && <SubmitListingButton id={l.id} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
