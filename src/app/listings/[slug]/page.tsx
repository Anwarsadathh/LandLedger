import Link from "next/link";
import { notFound } from "next/navigation";
import { EnquiryForm } from "@/components/EnquiryForm";
import { ListingGallery } from "@/components/ListingGallery";
import { ListingLocationMap } from "@/components/ListingLocationMap";
import { PriceInsights } from "@/components/PriceInsights";
import { getPublicListingBySlug } from "@/server/modules/listings/service";
import { getOwnerRatingForSlug } from "@/server/modules/ratings/service";
import { getPriceInsightsForListing } from "@/server/modules/insights/service";
import { getT } from "@/lib/i18n/server";
import { ApiError } from "@/lib/http";
import {
  CONTENT_LANGUAGE_BCP47,
  CONTENT_LANGUAGE_LABELS,
  LISTING_TYPE_LABELS,
  formatArea,
  formatPrice,
  stateLabel,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ListingDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let listing;
  try {
    listing = await getPublicListingBySlug(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const rating = await getOwnerRatingForSlug(slug);
  const insights = await getPriceInsightsForListing(listing);
  const t = await getT();

  const loc = listing.location;
  const subtypeLabel = listing.assetSubtype ?? LISTING_TYPE_LABELS[listing.listingType] ?? listing.listingType;
  const transactionLabel = listing.transactionType === "SALE" ? t("listing.forSale") : t("listing.forLease");
  const langLabel = CONTENT_LANGUAGE_LABELS[listing.contentLanguage] ?? "English";
  const langTag = CONTENT_LANGUAGE_BCP47[listing.contentLanguage] ?? "en";
  const isVernacular = listing.contentLanguage !== "EN";
  const locationLabel = [loc.locality, loc.subDistrict, loc.district, stateLabel(loc.state)]
    .filter(Boolean)
    .join(", ");
  const publishedLabel = listing.publishedAt
    ? new Date(listing.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const highlights = [
    { label: t("listing.price"), value: formatPrice(listing.price) },
    { label: t("listing.area"), value: formatArea(listing.area) },
    listing.area.normalizedSqFt ? { label: t("listing.builtUp"), value: `${listing.area.normalizedSqFt.toLocaleString("en-IN")} sq ft` } : null,
    { label: t("listing.transaction"), value: transactionLabel },
    { label: t("listing.listedIn"), value: langLabel },
    listing.features?.facing && listing.features.facing !== "UNKNOWN"
      ? { label: t("listing.facing"), value: listing.features.facing.replace(/_/g, " ").toLowerCase() }
      : null,
    listing.features?.roadAccess ? { label: t("listing.roadAccess"), value: String(listing.features.roadAccess).toLowerCase() } : null,
    { label: t("listing.pinPrecision"), value: loc.pinPrecision.replace(/_/g, " ").toLowerCase() },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex flex-col gap-6 pb-24 lg:pb-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
        {t("listing.back")}
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ---------- left ---------- */}
        <div className="flex flex-col gap-7 lg:col-span-2">
          <ListingGallery
            media={listing.media}
            title={listing.title}
            titleLang={langTag}
            subtypeLabel={subtypeLabel}
            transactionLabel={transactionLabel}
            priceLabel={formatPrice(listing.price)}
            locationLabel={locationLabel}
          />

          {/* Title shows in the photo overlay; when there are no photos, surface it here.
              Either way, make the listing's language unmistakable. */}
          <div className="flex flex-wrap items-center gap-3">
            {listing.media.length === 0 && (
              <h1 lang={langTag} className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {listing.title}
              </h1>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" strokeLinecap="round" />
              </svg>
              <span lang={langTag}>{langLabel}</span>
              {isVernacular && <span className="font-normal text-[var(--muted)]">· shown as written, not translated</span>}
            </span>
          </div>

          {/* highlights */}
          <section>
            <h2 className="mb-3 text-lg font-bold tracking-tight">{t("listing.highlights")}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {highlights.map((h) => (
                <div key={h.label} className="card p-4">
                  <p className="text-xs text-[var(--muted)]">{h.label}</p>
                  <p className="mt-0.5 font-semibold capitalize">{h.value}</p>
                </div>
              ))}
            </div>
          </section>

          <PriceInsights data={insights} />

          {/* description */}
          {listing.description && (
            <section>
              <h2 className="mb-2 text-lg font-bold tracking-tight">{t("listing.description")}</h2>
              <p lang={langTag} className="whitespace-pre-line text-sm leading-relaxed text-[var(--foreground)]/90">{listing.description}</p>
            </section>
          )}

          {/* map */}
          <section>
            <h2 className="mb-3 text-lg font-bold tracking-tight">{t("listing.location")}</h2>
            <ListingLocationMap latitude={loc.latitude} longitude={loc.longitude} pinPrecision={loc.pinPrecision} />
          </section>

          {/* honesty note */}
          <div className="flex gap-3 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4 text-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M11 12h1v4h1" />
            </svg>
            <p className="text-[var(--foreground)]/90">
              <strong>What was checked:</strong> listing details only. This is <em>not</em> a title
              guarantee or a legal/document review — always verify documents independently before you buy.
            </p>
          </div>
        </div>

        {/* ---------- right (sticky) ---------- */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
          {/* honest review card */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--foreground)] text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3Z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </span>
              <div>
                <p className="flex items-center gap-1.5 font-semibold">
                  {t("listing.humanReviewed")}
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--accent)]" fill="currentColor"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.8 7.2 17l.9-5.4L4.2 7.7l5.4-.8L12 2z" opacity="0" /><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {publishedLabel ? `Published on ${publishedLabel}` : "Reviewed by OROVA before publishing"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
              OROVA moderates every listing for quality before it goes live. We never show a fake
              “Verified” badge — only what was actually checked.
            </p>
          </div>

          {/* owner rating */}
          <div className="card p-5">
            <p className="text-sm font-semibold">{t("listing.ownerRating")}</p>
            {rating.average != null ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <svg
                      key={n}
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill={n <= Math.round(rating.average as number) ? "#e0813f" : "none"}
                      stroke="#e0813f"
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                    >
                      <path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-semibold">{rating.average.toFixed(1)}</span>
                <span className="text-xs text-[var(--muted)]">
                  ({rating.count} {rating.count === 1 ? t("listing.rating") : t("listing.ratings")})
                </span>
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-[var(--muted)]">{t("listing.noRatingsYet")}</p>
            )}
          </div>

          {/* enquiry */}
          <div id="enquire" className="scroll-mt-20">
            <EnquiryForm listingId={listing.id} listingTitle={listing.title} />
          </div>
        </div>
      </div>

      {/* ---------- mobile sticky action bar ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--card)]/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold">{formatPrice(listing.price)}</p>
            <p className="truncate text-xs text-[var(--muted)]">{formatArea(listing.area)}</p>
          </div>
          <a href="#enquire" className="btn-accent px-6 py-3">{t("listing.enquireNow")}</a>
        </div>
      </div>
    </div>
  );
}
