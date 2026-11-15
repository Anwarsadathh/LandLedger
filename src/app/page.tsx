import Link from "next/link";
import { cookies } from "next/headers";
import { ListingCard } from "@/components/ListingCard";
import { MarketplaceFilters } from "@/components/MarketplaceFilters";
import { HomeNearby } from "@/components/HomeNearby";
import { HeroBackground } from "@/components/HeroBackground";
import { Reveal } from "@/components/Reveal";
import type { PublicListing } from "@/server/modules/listings/dto";
import { LISTING_TYPE_LABELS, formatArea, formatPrice, stateLabel } from "@/lib/format";
import { searchPublicListings } from "@/server/modules/listings/service";
import { getT } from "@/lib/i18n/server";
import { LOC_COOKIE, parseLoc } from "@/lib/location-cookie";

export const dynamic = "force-dynamic";

// Curated land/aerial photos the hero rotates through (independent of listing
// data so the hero always looks intentional). Each URL was verified to load.
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2000&q=78", // land / plots
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=2000&q=78", // homes / residential
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=2000&q=78", // flats / apartments
  "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=2000&q=78", // agricultural / farmland
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=78", // commercial
];

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
  const t = await getT();
  const hasFilters = !!(sp.state || sp.city || sp.type || sp.q || sp.priceMin || sp.priceMax);

  // ---------- Search-results view ----------
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
          <h1 className="text-2xl font-semibold tracking-tight">{t("home.searchResults")}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {ok ? `${items.length} listing${items.length === 1 ? "" : "s"} found` : t("home.couldntLoad")}
          </p>
        </div>
        <MarketplaceFilters
          initial={{ q: sp.q, state: sp.state, city: sp.city, type: sp.type, priceMin: sp.priceMin, priceMax: sp.priceMax }}
        />
        {items.length === 0 ? (
          <div className="card border-dashed p-12 text-center">
            <p className="font-medium">{t("home.noMatch")}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">{t("home.widen")}</p>
            <Link href="/" className="btn-ghost mt-4 inline-flex">{t("home.clearFilters")}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </div>
    );
  }

  // ---------- Landing ----------
  // Location-aware feed: if the visitor set a location, show listings in their
  // state first, then fill with the latest from everywhere.
  const locPref = parseLoc((await cookies()).get(LOC_COOKIE)?.value);
  let featured: PublicListing[] = locPref?.state ? (await getListings({ state: locPref.state, limit: 12 })).items : [];
  if (featured.length < 6) {
    const latest = (await getListings({ limit: 12 })).items;
    const seen = new Set(featured.map((f) => f.id));
    featured = [...featured, ...latest.filter((l) => !seen.has(l.id))].slice(0, 12);
  }
  const popular = featured.slice(0, 8);
  const recent = featured.slice(0, 6);
  const more = (featured.length > 6 ? featured.slice(6) : featured).slice(0, 5);

  return (
    <div className="flex flex-col gap-16">
      {/* ===== HERO ===== */}
      <section className="full-bleed relative -mt-8 overflow-hidden">
        {/* rotating land photos + readability gradients */}
        <div aria-hidden className="absolute inset-0">
          <HeroBackground images={HERO_IMAGES} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
        </div>

        <div className="relative mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col justify-center px-4 py-14 text-white sm:min-h-[76vh] sm:py-20">
          <span className="animate-fade-up inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            {t("home.heroBadge")}
          </span>

          <h1 className="animate-fade-up mt-5 max-w-2xl text-[2.25rem] font-extrabold leading-[1.06] tracking-tight drop-shadow-sm sm:text-5xl lg:text-6xl" style={{ animationDelay: "0.06s" }}>
            {t("home.heroTitle1")}{" "}
            <span className="text-[#a5b4fc]">{t("home.heroTitle2")}</span>.
          </h1>

          <p className="animate-fade-up mt-4 max-w-xl text-base text-white/85 sm:text-lg" style={{ animationDelay: "0.12s" }}>
            {t("home.heroSubtitle")}
          </p>

          {/* prominent search */}
          <div className="animate-fade-up mt-6 w-full max-w-3xl rounded-2xl shadow-2xl shadow-black/40 sm:mt-7" style={{ animationDelay: "0.18s" }}>
            <MarketplaceFilters initial={{}} variant="compact" />
          </div>

          <div className="animate-fade-up mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85" style={{ animationDelay: "0.24s" }}>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />Human-reviewed</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />Land &amp; property across India</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />Free to list</span>
          </div>
        </div>
      </section>

      {/* ===== CATEGORY CHIPS ===== */}
      <section className="-mt-6">
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
          {CHIPS.map((c) => (
            <Link
              key={c.labelKey}
              href={c.type ? `/?type=${c.type}` : "#listings"}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                c.active
                  ? "border-transparent bg-[var(--foreground)] text-white"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {t(c.labelKey)}
            </Link>
          ))}
        </div>
      </section>

      {/* ===== QUICK TILES ===== */}
      <section className="-mt-12">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {QUICK_TILES.map((tile, i) => (
            <Reveal key={tile.labelKey} delay={i * 70}>
              <Link
                href={tile.href}
                className="group relative flex aspect-[5/4] flex-col justify-end overflow-hidden rounded-2xl bg-[#0f172a] p-4 text-white"
                style={
                  featured[i]?.media?.[0]?.url
                    ? {
                        backgroundImage: `linear-gradient(to top, rgba(15, 23, 42,0.88), rgba(15, 23, 42,0.15)), url(${featured[i].media[0].url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur transition group-hover:bg-[var(--accent)]">
                  {tile.icon}
                </span>
                <span className="mt-3 block font-semibold">{t(tile.labelKey)}</span>
                <span className="text-xs text-white/70">{t(tile.subKey)}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== LOCATION-AWARE FEED CONTROL ===== */}
      <section className="-mt-10">
        <HomeNearby city={locPref?.city} state={locPref?.state} />
      </section>

      {featured.length === 0 ? (
        <section id="listings" className="scroll-mt-24">
          <div className="card border-dashed p-12 text-center text-sm text-[var(--muted)]">
            No published listings yet — be the first to{" "}
            <Link href="/listings/new" className="font-medium text-[var(--accent)] hover:underline">list a property</Link>.
          </div>
        </section>
      ) : (
        <>
          {/* ===== POPULAR (overlay card scroll row) ===== */}
          <section id="listings" className="scroll-mt-24">
            <SectionHead eyebrow={t("home.trending")} title={t("home.popular")} action={<Link href="/?type=LAND_PLOT" className="text-sm font-semibold text-[var(--accent)] hover:underline">{t("home.seeAll")}</Link>} />
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
              {popular.map((l) => (
                <div key={l.id} className="w-[220px] shrink-0 snap-start sm:w-[250px]">
                  <OverlayCard listing={l} />
                </div>
              ))}
            </div>
          </section>

          {/* ===== RECENTLY LISTED (grid) ===== */}
          <section>
            <SectionHead eyebrow={t("nav.marketplace")} title={t("home.recently")} sub={t("home.recentlySub")} action={<Link href="/?type=RESIDENTIAL" className="text-sm font-semibold text-[var(--accent)] hover:underline">{t("home.viewAll")}</Link>} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((l, i) => (
                <Reveal key={l.id} delay={(i % 3) * 90}>
                  <ListingCard listing={l} />
                </Reveal>
              ))}
            </div>
          </section>

          {/* ===== MORE (list rows) ===== */}
          {more.length > 0 && (
            <section>
              <SectionHead eyebrow={t("home.keepExploring")} title={t("home.moreAcross")} />
              <div className="flex flex-col gap-3">
                {more.map((l) => (
                  <ListRow key={l.id} listing={l} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ===== HOW IT WORKS ===== */}
      <section>
        <SectionHead eyebrow={t("home.forOwners")} title={t("home.listInMinutes")} sub="From your phone to the marketplace in three steps." />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 110}>
              <div className="card h-full p-6 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--foreground)] text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== WHY ===== */}
      <section>
        <SectionHead eyebrow={t("home.whyOrova")} title="Built on honesty, not hype" sub="The things that matter when money and land are on the line." />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <div className="card h-full p-6 shadow-sm transition hover:shadow-lg">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">{f.icon}</span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="full-bleed relative -mb-8 overflow-hidden bg-[#1e1b4b] text-white">
        {/* layered indigo glow + fine grid */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_130%_at_100%_0%,rgba(129,140,248,0.28),transparent_55%),radial-gradient(55%_120%_at_0%_100%,rgba(79,70,229,0.38),transparent_60%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:30px_30px]" />
        {/* map motif — route lines + glowing property pins */}
        <svg aria-hidden viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full">
          <path d="M-20 120 C 200 60, 400 210, 650 130 S 1000 60, 1240 180" fill="none" stroke="rgba(129,140,248,0.16)" strokeWidth="2" strokeDasharray="5 9" />
          <path d="M-20 310 C 250 250, 470 340, 730 275 S 1050 300, 1240 240" fill="none" stroke="rgba(199,210,254,0.11)" strokeWidth="2" strokeDasharray="5 9" />
          <circle cx="330" cy="150" r="16" fill="rgba(129,140,248,0.10)" />
          <circle cx="330" cy="150" r="3.5" fill="#818cf8" />
          <circle cx="700" cy="268" r="16" fill="rgba(129,140,248,0.10)" />
          <circle cx="700" cy="268" r="3.5" fill="#a5b4fc" />
          <circle cx="1070" cy="150" r="16" fill="rgba(129,140,248,0.10)" />
          <circle cx="1070" cy="150" r="3.5" fill="#818cf8" />
          {/* focal pin */}
          <g transform="translate(940,132)">
            <circle r="30" fill="rgba(129,140,248,0.10)" />
            <circle r="18" fill="rgba(129,140,248,0.14)" />
            <path d="M0 -18 C 10 -18, 18 -10, 18 0 C 18 13, 0 30, 0 30 S -18 13, -18 0 C -18 -10, -10 -18, 0 -18 Z" fill="#818cf8" />
            <circle cy="-1" r="5" fill="#1e1b4b" />
          </g>
        </svg>
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#818cf8]/60 to-transparent" />

        <Reveal>
          <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1.3fr_.7fr] lg:items-center lg:gap-12 lg:py-20">
            {/* ---- copy ---- */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a5b4fc]" />
                For owners &amp; brokers
              </span>

              <h2 className="mt-4 text-[1.75rem] font-extrabold leading-[1.1] tracking-tight sm:text-[2.25rem] lg:text-[2.75rem]">
                Put your land on the map.{" "}
                <span className="bg-gradient-to-r from-[#a5b4fc] to-[#818cf8] bg-clip-text text-transparent">List it free.</span>
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/65 sm:text-[15px]">
                Add your plot, home or farmland, drop a map pin and a few photos — and reach buyers across India. Your phone number stays private until you choose to share it.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/60 sm:text-[13px]">
                <span className="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#a5b4fc]" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  Always free
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#a5b4fc]" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  Human-reviewed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#a5b4fc]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  Private by default
                </span>
              </div>
            </div>

            {/* ---- action card ---- */}
            <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-5 backdrop-blur-sm sm:p-6">
              <p className="text-sm font-semibold text-white">Start in under 2 minutes</p>
              <p className="mt-1 text-xs text-white/55">No fees, no commission — ever.</p>
              <Link
                href="/listings/new"
                className="group mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#818cf8] px-5 py-3 text-sm font-bold text-[#1e1b4b] shadow-lg shadow-[#4f46e5]/25 transition hover:-translate-y-0.5 hover:bg-[#a5b4fc]"
              >
                Start your free listing <Arrow />
              </Link>
              <Link
                href="/signup"
                className="mt-2.5 flex w-full items-center justify-center rounded-full border border-white/20 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                Create an account
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/* ---------------- cards ---------------- */

function OverlayCard({ listing }: { listing: PublicListing }) {
  const cover = listing.media[0]?.url;
  const typeLabel = listing.assetSubtype ?? LISTING_TYPE_LABELS[listing.listingType] ?? listing.listingType;
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl bg-[var(--accent-soft)] p-4 text-white"
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={listing.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="relative">
        <span className="inline-block max-w-full truncate rounded-full bg-white/90 px-2.5 py-0.5 align-top text-[11px] font-semibold text-[var(--foreground)]">{typeLabel}</span>
        <h3 className="mt-2 line-clamp-1 font-semibold drop-shadow">{listing.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-white/80">
          {listing.location.locality ? `${listing.location.locality}, ` : ""}{stateLabel(listing.location.state)}
        </p>
        <p className="mt-1.5 truncate text-sm font-bold">{formatPrice(listing.price)}</p>
      </div>
    </Link>
  );
}

function ListRow({ listing }: { listing: PublicListing }) {
  const cover = listing.media[0]?.url;
  const typeLabel = listing.assetSubtype ?? LISTING_TYPE_LABELS[listing.listingType] ?? listing.listingType;
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2.5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--accent-soft)] sm:w-24">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={listing.title} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-1 font-semibold group-hover:text-[var(--accent)]">{listing.title}</h3>
            <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted)]">
              {listing.location.locality ? `${listing.location.locality}, ` : ""}
              {listing.location.district}, {stateLabel(listing.location.state)}
            </p>
          </div>
          <p className="shrink-0 whitespace-nowrap text-right text-sm font-extrabold tracking-tight sm:text-base">
            {formatPrice(listing.price)}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-medium text-[var(--accent)]">{typeLabel}</span>
          <span>{formatArea(listing.area)}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--muted)]/60" />
          <span>{listing.transactionType === "SALE" ? "For sale" : "For lease"}</span>
        </div>
      </div>
    </Link>
  );
}

/* ---------------- content ---------------- */

const CHIPS = [
  { labelKey: "home.all", type: "", active: true },
  { labelKey: "nav.landPlots", type: "LAND_PLOT", active: false },
  { labelKey: "nav.homes", type: "RESIDENTIAL", active: false },
  { labelKey: "nav.commercial", type: "COMMERCIAL", active: false },
  { labelKey: "home.agricultural", type: "AGRICULTURAL", active: false },
];

const QUICK_TILES = [
  { labelKey: "nav.landPlots", subKey: "home.tile.landSub", href: "/?type=LAND_PLOT", icon: <IconMap /> },
  { labelKey: "home.tile.homes", subKey: "home.tile.homesSub", href: "/?type=RESIDENTIAL", icon: <IconHome /> },
  { labelKey: "nav.commercial", subKey: "home.tile.commercialSub", href: "/?type=COMMERCIAL", icon: <IconBuilding /> },
  { labelKey: "home.tile.farmland", subKey: "home.tile.farmlandSub", href: "/?type=AGRICULTURAL", icon: <IconSprout /> },
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

function SectionHead({ eyebrow, title, sub, action }: { eyebrow: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">{eyebrow}</p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {sub && <p className="mt-1.5 text-sm text-[var(--muted)]">{sub}</p>}
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </div>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/* ---------------- icons ---------------- */

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
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
