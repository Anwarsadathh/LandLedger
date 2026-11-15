import { Types } from "mongoose";
import { connectToDatabase } from "@/server/db/connect";
import { Listing } from "@/server/db/models/listing";
import { stateLabel } from "@/lib/format";
import type { PublicListing } from "@/server/modules/listings/dto";

// Indicative price insights — computed ONLY from our own published listings.
// We have no historical price feed, so this is a transparency aid, never a
// valuation. ₹/sq ft is comparable only within the same property type, so we
// always hold the type fixed and widen the geography (district -> state) to
// reach a usable sample.
const MIN_SAMPLE = 3;
const MIN_TREND_MONTHS = 3; // need at least this many dated months for an honest trend
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type TrendPoint = { label: string; median: number };

export type PriceInsights = {
  area: string; // display name of the geography the stats cover
  scope: "district" | "state";
  listingType: string;
  count: number; // comparable listings used (excludes this one)
  medianPerSqFt: number | null;
  p25: number | null;
  p75: number | null;
  thisPerSqFt: number | null;
  position: "below" | "around" | "above" | null;
  trend: TrendPoint[] | null; // monthly median ₹/sq ft, when enough dated history
};

type Sample = { v: number; at: Date | null };
type PriceRow = {
  price?: { min?: number };
  area?: { normalizedSqFt?: number | null };
  publishedAt?: Date;
  createdAt?: Date;
};

// ₹/sq ft + a date for every published, TOTAL-priced listing with a known sq-ft
// area that matches `match` (excluding the current listing).
async function sample(match: Record<string, unknown>, excludeId: string): Promise<Sample[]> {
  const query: Record<string, unknown> = {
    ...match,
    workflowStatus: "PUBLISHED",
    "price.basis": "TOTAL",
    "area.normalizedSqFt": { $gt: 0 },
  };
  if (Types.ObjectId.isValid(excludeId)) query._id = { $ne: new Types.ObjectId(excludeId) };

  const docs = (await Listing.find(query, {
    "price.min": 1,
    "area.normalizedSqFt": 1,
    publishedAt: 1,
    createdAt: 1,
  }).lean()) as unknown as PriceRow[];

  return docs
    .map((d) => ({
      v: (d.price?.min ?? 0) / (d.area?.normalizedSqFt ?? 0),
      at: d.publishedAt ?? d.createdAt ?? null,
    }))
    .filter((s) => Number.isFinite(s.v) && s.v > 0);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// Monthly median ₹/sq ft over the last few months. Null unless there is enough
// dated history to be honest (>= MIN_TREND_MONTHS distinct months).
function buildTrend(samples: Sample[]): TrendPoint[] | null {
  const byMonth = new Map<string, number[]>();
  for (const s of samples) {
    if (!s.at) continue;
    const d = new Date(s.at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(s.v);
    else byMonth.set(key, [s.v]);
  }
  const months = [...byMonth.keys()].sort();
  if (months.length < MIN_TREND_MONTHS) return null;
  return months.slice(-8).map((m) => {
    const arr = (byMonth.get(m) ?? []).slice().sort((a, b) => a - b);
    return { label: MONTH_LABELS[Number(m.slice(5, 7)) - 1], median: Math.round(percentile(arr, 0.5)) };
  });
}

export async function getPriceInsightsForListing(listing: PublicListing): Promise<PriceInsights> {
  await connectToDatabase();

  const { district, state } = listing.location;
  const type = listing.listingType;

  // This listing's own ₹/sq ft (only when comparably priced).
  const thisPerSqFt =
    listing.price.basis === "TOTAL" && listing.area.normalizedSqFt && listing.area.normalizedSqFt > 0
      ? Math.round(listing.price.min / listing.area.normalizedSqFt)
      : null;

  // District first; widen to state if the district sample is too thin.
  let scope: PriceInsights["scope"] = "district";
  let area = district;
  let samples = await sample({ "location.district": district, listingType: type }, listing.id);
  if (samples.length < MIN_SAMPLE) {
    const wider = await sample({ "location.state": state, listingType: type }, listing.id);
    if (wider.length > samples.length) {
      samples = wider;
      scope = "state";
      area = stateLabel(state);
    }
  }

  const trend = buildTrend(samples);

  const base: PriceInsights = {
    area,
    scope,
    listingType: type,
    count: samples.length,
    medianPerSqFt: null,
    p25: null,
    p75: null,
    thisPerSqFt,
    position: null,
    trend,
  };

  if (samples.length < MIN_SAMPLE) return base;

  const sorted = samples.map((s) => s.v).sort((a, b) => a - b);
  const median = Math.round(percentile(sorted, 0.5));
  const p25 = Math.round(percentile(sorted, 0.25));
  const p75 = Math.round(percentile(sorted, 0.75));

  let position: PriceInsights["position"] = null;
  if (thisPerSqFt != null) {
    position = thisPerSqFt < p25 ? "below" : thisPerSqFt > p75 ? "above" : "around";
  }

  return { ...base, medianPerSqFt: median, p25, p75, position };
}
