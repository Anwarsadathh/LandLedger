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

async function getListings(filters: {
  state?: string;
  city?: string;
  type?: string;
  q?: string;
  priceMin?: number;
  priceMax?: number;
  limit: number;
}) {
  try {
    const res = await searchPublicListings({
      state: filters.state,
      city: filters.city,
      listingType: filters.type,
      q: filters.q,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      limit: filters.limit,
    });
    return { items: res.items, ok: true as const };
  } catch {
    return { items: [], ok: false as const };
  }
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const hasFilters = !!(sp.state || sp.city || sp.type || sp.q || sp.priceMin || sp.priceMax);

  // ---------- Search-results view (when the user has searched) ----------
  if (hasFilters) {
    const { items, ok } = await getListings({
      state: sp.state,
      city: sp.city,
      type: sp.type,
      q: sp.q,
      priceMin: sp.priceMin ? Number(sp.priceMin) : undefined,
      priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
      limit: 48,
    });

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Search results</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {ok ? `${items.length} listing${items.length === 1 ? "" : "s"} found` : "Couldn’t load listings right now."}
          </p>
        </div>

        <MarketplaceFilters
          initial={{ q: sp.q, state: sp.state, city: sp.city, type: sp.type, priceMin: sp.priceMin, priceMax: sp.priceMax }}
        />

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
            <p className="font-medium">No listings match your filters</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">
              Try widening your search, or clear the filters to see everything.
            </p>
            <Link href="/" className="btn-ghost mt-4 inline-flex">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- Landing view ----------
  const { items: featured } = await getListings({ limit: 6 });

  return (
    <div className="flex flex-col gap-20 pb-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-5 py-12 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-blue-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-3 py-1 text-xs font-medium text-blue-700 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Land &amp; property across India
          </span>

          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-[var(--foreground)] sm:text-6xl">
            Find land &amp; property{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              you can trust
            </span>
            .
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base text-[var(--muted)] sm:text-lg">
            A transparent marketplace for plots, homes and farmland. Every listing shows exactly what
            was checked — no misleading “Verified” badges.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/listings/new" className="btn-primary px-6 py-2.5 text-base">
              List your property
            </Link>
            <a href="#listings" className="btn-ghost px-6 py-2.5 text-base">
              Browse listings
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[var(--muted)]">
            <TrustChip>Free to list</TrustChip>
            <TrustChip>Human-reviewed</TrustChip>
            <TrustChip>Local units — bigha, katha, acre</TrustChip>
          </div>
        </div>

        {/* Search card */}
        <div className="relative mx-auto mt-9 max-w-4xl">
          <p className="mb-2 px-1 text-sm font-medium text-[var(--foreground)]">Search listings</p>
          <MarketplaceFilters initial={{}} />
        </div>
      </section>

      {/* CATEGORIES */}
      <section>
        <SectionHeader title="Browse by category" sub="Jump straight to what you’re looking for." />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.type}
              href={`/?type=${c.type}`}
              className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                {c.icon}
              </span>
              <span>
                <span className="block font-semibold">{c.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{c.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED LISTINGS */}
      <section id="listings" className="scroll-mt-20">
        <SectionHeader
          title="Recently listed"
          sub="Fresh plots, homes and land from owners and brokers."
          action={<Link href="/?type=LAND_PLOT" className="text-sm font-medium text-blue-600 hover:underline">View all →</Link>}
        />
        {featured.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-sm text-[var(--muted)]">
            No published listings yet — be the first to{" "}
            <Link href="/listings/new" className="font-medium text-blue-600 hover:underline">list a property</Link>.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section>
        <SectionHeader title="List in minutes" sub="From your phone to the marketplace in three steps." />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY / TRUST */}
      <section>
        <SectionHeader
          title="Built on honesty, not hype"
          sub="The things that actually matter when money and land are on the line."
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {f.icon}
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-12 text-center sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to list your property?</h2>
          <p className="mx-auto mt-3 max-w-lg text-blue-100">
            It’s free. Add your plot, home or land, drop a map pin, and reach buyers across India — your
            contact details stay private.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/listings/new"
              className="inline-flex items-center justify-center rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              List a property — free
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md border border-white/40 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Create an account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- content ---------------- */

const CATEGORIES = [
  { label: "Land & Plots", type: "LAND_PLOT", desc: "Residential & commercial plots", icon: <IconMap /> },
  { label: "Residential", type: "RESIDENTIAL", desc: "Flats, villas, builder floors", icon: <IconHome /> },
  { label: "Commercial", type: "COMMERCIAL", desc: "Offices, shops, warehouses", icon: <IconBuilding /> },
  { label: "Agricultural", type: "AGRICULTURAL", desc: "Farmland & orchards", icon: <IconSprout /> },
];

const STEPS = [
  { title: "Add your details", body: "Property type, price, area in local units, a map pin and a few photos — in minutes." },
  { title: "We review it", body: "Our team checks each listing for quality and clarity before it goes live." },
  { title: "Go live & connect", body: "Approved listings appear in search and buyers enquire — your number stays private." },
];

const FEATURES = [
  { title: "No fake “Verified”", body: "We show exactly what was checked, by whom and when — never a misleading green badge.", icon: <IconShield /> },
  { title: "Human-reviewed", body: "Every listing is moderated before it’s published. No spam, no junk.", icon: <IconCheck /> },
  { title: "Made for Indian land", body: "Bigha, katha, decimal, acre — plus state, district and locality, all state-aware.", icon: <IconMap /> },
  { title: "Your data stays private", body: "Phone numbers and documents are never exposed on public listings.", icon: <IconLock /> },
];

/* ---------------- primitives ---------------- */

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {sub && <p className="mt-1 text-sm text-[var(--muted)]">{sub}</p>}
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </div>
  );
}

function TrustChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {children}
    </span>
  );
}

/* ---------------- icons ---------------- */

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
function IconMap() {
  return (
    <Svg>
      <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13 6-3m-6 3V7m6 10 4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" />
    </Svg>
  );
}
function IconHome() {
  return (
    <Svg>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10" />
    </Svg>
  );
}
function IconBuilding() {
  return (
    <Svg>
      <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 21V9h5a1 1 0 0 1 1 1v11M3 21h18M7.5 8h3M7.5 12h3M7.5 16h3M17 13h0M17 17h0" />
    </Svg>
  );
}
function IconSprout() {
  return (
    <Svg>
      <path d="M12 22v-9" />
      <path d="M12 13c0-3.3 2.2-5.5 5.5-5.5C17.5 10.8 15.3 13 12 13Z" />
      <path d="M12 13c0-3.3-2.2-5.5-5.5-5.5C6.5 10.8 8.7 13 12 13Z" />
    </Svg>
  );
}
function IconShield() {
  return (
    <Svg>
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  );
}
function IconCheck() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </Svg>
  );
}
function IconLock() {
  return (
    <Svg>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}
