import Link from "next/link";
import type { PublicListing } from "@/server/modules/listings/dto";
import {
  CONTENT_LANGUAGE_BCP47,
  CONTENT_LANGUAGE_LABELS,
  LISTING_TYPE_LABELS,
  formatArea,
  formatPrice,
  stateLabel,
} from "@/lib/format";

export function ListingCard({ listing, compact = false }: { listing: PublicListing; compact?: boolean }) {
  const cover = listing.media[0]?.url;
  const typeLabel = listing.assetSubtype ?? LISTING_TYPE_LABELS[listing.listingType] ?? listing.listingType;
  const langTag = CONTENT_LANGUAGE_BCP47[listing.contentLanguage] ?? "en";
  const isVernacular = listing.contentLanguage !== "EN";

  const pill = compact
    ? "px-2 py-0.5 text-[10px] sm:px-2.5 sm:text-[11px]"
    : "px-3 py-1 text-xs";

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5"
    >
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-[var(--accent-soft)]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">No photo</div>
        )}

        {/* type + transaction pills */}
        <div className={`absolute flex flex-wrap gap-1.5 ${compact ? "left-2 top-2" : "left-3 top-3 gap-2"}`}>
          <span className={`inline-flex items-center rounded-full bg-white/95 font-semibold text-[var(--foreground)] shadow-sm backdrop-blur ${pill}`}>
            {typeLabel}
          </span>
          <span className={`inline-flex items-center rounded-full bg-[var(--foreground)]/85 font-semibold text-white backdrop-blur ${pill}`}>
            {listing.transactionType === "SALE" ? "For sale" : "For lease"}
          </span>
        </div>
      </div>

      <div className={`flex flex-1 flex-col ${compact ? "gap-1.5 p-2.5 sm:gap-2.5 sm:p-4" : "gap-2.5 p-4"}`}>
        <div>
          <div className="flex items-center gap-1.5">
            <h3
              lang={langTag}
              className={`line-clamp-1 font-semibold tracking-tight group-hover:text-[var(--accent)] ${
                compact ? "text-sm sm:text-base" : ""
              }`}
            >
              {listing.title}
            </h3>
            {isVernacular && (
              <span
                lang={langTag}
                className="shrink-0 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]"
              >
                {CONTENT_LANGUAGE_LABELS[listing.contentLanguage]}
              </span>
            )}
          </div>
          <p className={`mt-0.5 flex items-center gap-1 text-[var(--muted)] ${compact ? "text-[11px] sm:text-sm" : "text-sm"}`}>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span className="line-clamp-1">
              {listing.location.locality ? `${listing.location.locality}, ` : ""}
              {listing.location.district}, {stateLabel(listing.location.state)}
            </span>
          </p>
        </div>

        {compact ? (
          <div className="mt-auto border-t border-[var(--border)] pt-2">
            <p className="text-sm font-extrabold leading-tight tracking-tight sm:text-base">{formatPrice(listing.price)}</p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">{formatArea(listing.area)}</p>
          </div>
        ) : (
          <div className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--border)] pt-3">
            <div>
              <p className="text-lg font-extrabold tracking-tight">{formatPrice(listing.price)}</p>
              <p className="text-xs text-[var(--muted)]">{formatArea(listing.area)}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition group-hover:bg-[var(--accent)] group-hover:text-white">
              View
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
