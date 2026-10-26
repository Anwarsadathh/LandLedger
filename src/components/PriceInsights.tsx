import { LISTING_TYPE_LABELS } from "@/lib/format";
import type { PriceInsights as Insights } from "@/server/modules/insights/service";

const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const VERDICT: Record<NonNullable<Insights["position"]>, string> = {
  below: "priced below similar listings",
  around: "in line with similar listings",
  above: "priced above similar listings",
};

export function PriceInsights({ data }: { data: Insights }) {
  const typeLabel = (LISTING_TYPE_LABELS[data.listingType] ?? data.listingType).toLowerCase();

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-bold tracking-tight">Price insights</h2>
        <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
          Indicative
        </span>
      </div>

      {data.medianPerSqFt == null ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
          Not enough comparable {typeLabel} listings in {data.area} yet to show a price guide. We&apos;ll
          show one here as more listings go live.
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--foreground)]">
            Median <strong>{rupee(data.medianPerSqFt)}/sq ft</strong> for {typeLabel} in{" "}
            <strong>{data.area}</strong>
            <span className="text-[var(--muted)]"> · from {data.count} OROVA listing{data.count === 1 ? "" : "s"}</span>
          </p>

          <RangeBar p25={data.p25!} p75={data.p75!} median={data.medianPerSqFt} marker={data.thisPerSqFt} />

          <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>{rupee(data.p25!)}</span>
            <span>typical range (25–75%)</span>
            <span>{rupee(data.p75!)}</span>
          </div>

          {data.thisPerSqFt != null && data.position && (
            <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm">
              This listing (<strong>{rupee(data.thisPerSqFt)}/sq ft</strong>) is{" "}
              <span
                className={
                  data.position === "above"
                    ? "font-semibold text-[var(--accent)]"
                    : data.position === "below"
                      ? "font-semibold text-green-700"
                      : "font-semibold"
                }
              >
                {VERDICT[data.position]}
              </span>
              .
            </p>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
            Indicative only — computed from OROVA listings{data.scope === "state" ? " across the state" : ""}, not a
            valuation. Prices vary by exact location, approvals and documents. Always verify independently.
          </p>
        </div>
      )}
    </section>
  );
}

function RangeBar({
  p25,
  p75,
  median,
  marker,
}: {
  p25: number;
  p75: number;
  median: number;
  marker: number | null;
}) {
  // Scale spans the band plus this listing's marker, with a little padding.
  const lo = Math.min(p25, marker ?? p25) * 0.95;
  const hi = Math.max(p75, marker ?? p75) * 1.05;
  const span = hi - lo || 1;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));

  return (
    <div className="relative mt-4 mb-1 h-2 rounded-full bg-[var(--background)]">
      {/* 25–75% band */}
      <div
        className="absolute top-0 h-2 rounded-full bg-[var(--accent-soft)]"
        style={{ left: `${pct(p25)}%`, right: `${100 - pct(p75)}%` }}
      />
      {/* median tick */}
      <div
        className="absolute top-[-3px] h-[14px] w-0.5 -translate-x-1/2 bg-[var(--foreground)]"
        style={{ left: `${pct(median)}%` }}
        aria-hidden
      />
      {/* this listing */}
      {marker != null && (
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--accent)] shadow"
          style={{ left: `${pct(marker)}%` }}
          aria-hidden
        />
      )}
    </div>
  );
}
