import Link from "next/link";
import { notFound } from "next/navigation";
import { EnquiryForm } from "@/components/EnquiryForm";
import { getPublicListingBySlug } from "@/server/modules/listings/service";
import { ApiError } from "@/lib/http";
import {
  LISTING_TYPE_LABELS,
  formatArea,
  formatPrice,
  stateLabel,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ListingDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let listing;
  try {
    listing = await getPublicListingBySlug(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const loc = listing.location;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Back to marketplace
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div>
            <span className="badge">{listing.assetSubtype ?? LISTING_TYPE_LABELS[listing.listingType] ?? listing.listingType}</span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{listing.title}</h1>
            <p className="mt-1 text-[var(--muted)]">
              {loc.locality ? `${loc.locality}, ` : ""}
              {loc.subDistrict ? `${loc.subDistrict}, ` : ""}
              {loc.district}, {stateLabel(loc.state)}
            </p>
          </div>

          {listing.media.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {listing.media.map((m, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={m.url}
                  alt={`${listing.title} ${i + 1}`}
                  className="aspect-video w-full rounded-lg object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--muted)]">
              No photos provided
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Price" value={formatPrice(listing.price)} />
            <Stat label="Area" value={formatArea(listing.area)} />
            <Stat label="Pin precision" value={loc.pinPrecision.replace(/_/g, " ").toLowerCase()} />
            {listing.features?.facing && listing.features.facing !== "UNKNOWN" && (
              <Stat label="Facing" value={listing.features.facing.replace(/_/g, " ").toLowerCase()} />
            )}
            {listing.features?.roadAccess && (
              <Stat label="Road access" value={listing.features.roadAccess.toLowerCase()} />
            )}
          </div>

          {listing.description && (
            <div>
              <h2 className="mb-1 font-medium">Description</h2>
              <p className="whitespace-pre-line text-sm text-[var(--foreground)]">{listing.description}</p>
            </div>
          )}

          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-[var(--foreground)]">
            <strong>What was checked:</strong> listing details only. This is <em>not</em> a title
            guarantee or a legal/document review. Coordinates: {loc.latitude}, {loc.longitude}.
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <EnquiryForm listingId={listing.id} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-medium capitalize">{value}</p>
    </div>
  );
}
