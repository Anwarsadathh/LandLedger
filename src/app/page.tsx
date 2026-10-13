import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";
import { MarketplaceFilters } from "@/components/MarketplaceFilters";
import { searchPublicListings } from "@/server/modules/listings/service";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  state?: string;
  city?: string;
  type?: string;
  q?: string;
  priceMin?: string;
  priceMax?: string;
}>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  let items: Awaited<ReturnType<typeof searchPublicListings>>["items"] = [];
  let error: string | null = null;
  try {
    const result = await searchPublicListings({
      state: sp.state,
      city: sp.city,
      listingType: sp.type,
      q: sp.q,
      priceMin: sp.priceMin ? Number(sp.priceMin) : undefined,
      priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
      limit: 24,
    });
    items = result.items;
  } catch {
    error =
      "Could not reach the database. Set MONGODB_URI in .env.local, then run `npm run seed`.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Property & land listings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Property & land listings across India — published only. Each listing shows exactly what
          was checked; nothing here is a title guarantee.
        </p>
      </div>

      <MarketplaceFilters
        initial={{
          q: sp.q,
          state: sp.state,
          city: sp.city,
          type: sp.type,
          priceMin: sp.priceMin,
          priceMax: sp.priceMax,
        }}
      />

      {error ? (
        <EmptyState title="Not connected yet" body={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No listings match"
          body="Try clearing filters, create one from “List a property”, or run `npm run seed` for demo data."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">{body}</p>
      <Link href="/listings/new" className="btn-primary mt-4 inline-flex">
        List a property
      </Link>
    </div>
  );
}
