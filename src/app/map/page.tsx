import type { Metadata } from "next";
import { MapExplorer } from "@/components/MapExplorer";
import { MarketplaceFilters } from "@/components/MarketplaceFilters";
import type { PublicListing } from "@/server/modules/listings/dto";
import { searchPublicListings } from "@/server/modules/listings/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Explore on the map — OROVA" };

type SearchParams = Promise<{
  state?: string;
  city?: string;
  type?: string;
  q?: string;
  priceMin?: string;
  priceMax?: string;
}>;

export default async function MapPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  let items: PublicListing[] = [];
  try {
    const res = await searchPublicListings({
      state: sp.state,
      city: sp.city,
      listingType: sp.type,
      q: sp.q,
      priceMin: sp.priceMin ? Number(sp.priceMin) : undefined,
      priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
      limit: 300,
    });
    items = res.items;
  } catch {
    items = [];
  }

  const onMap = items.filter(
    (i) => Number.isFinite(i.location.latitude) && Number.isFinite(i.location.longitude),
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Discover</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Explore land &amp; property on the map</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {onMap} listing{onMap === 1 ? "" : "s"} on the map · tap a pin or hover a card to connect them.
        </p>
      </div>

      <MarketplaceFilters
        basePath="/map"
        initial={{ q: sp.q, state: sp.state, city: sp.city, type: sp.type, priceMin: sp.priceMin, priceMax: sp.priceMax }}
      />

      <MapExplorer items={items} />
    </div>
  );
}
