import Link from "next/link";
import type { PublicListing } from "@/server/modules/listings/dto";
import { LISTING_TYPE_LABELS, formatArea, formatPrice, stateLabel } from "@/lib/format";

export function ListingCard({ listing }: { listing: PublicListing }) {
  const cover = listing.media[0]?.url;
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition hover:border-[var(--primary)] hover:shadow-sm"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-[var(--background)]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={listing.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
            No photo
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--muted)]">
          <span>{listing.assetSubtype ?? LISTING_TYPE_LABELS[listing.listingType] ?? listing.listingType}</span>
          <span>·</span>
          <span>{listing.transactionType === "SALE" ? "For sale" : "For lease"}</span>
        </div>
        <h3 className="line-clamp-2 font-medium group-hover:text-[var(--primary)]">{listing.title}</h3>
        <p className="text-sm text-[var(--muted)]">
          {listing.location.locality ? `${listing.location.locality}, ` : ""}
          {listing.location.district}, {stateLabel(listing.location.state)}
        </p>
        <div className="mt-auto pt-2">
          <p className="font-semibold">{formatPrice(listing.price)}</p>
          <p className="text-sm text-[var(--muted)]">{formatArea(listing.area)}</p>
        </div>
      </div>
    </Link>
  );
}
