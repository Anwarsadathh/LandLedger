import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";
import { MarketplaceFilters } from "@/components/MarketplaceFilters";
import { Reveal } from "@/components/Reveal";
import type { PublicListing } from "@/server/modules/listings/dto";
import { LISTING_TYPE_LABELS, formatArea, formatPrice, stateLabel } from "@/lib/format";
import { searchPublicListings } from "@/server/modules/listings/service";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// Curated, premium architecture shot — independent of listing data so the hero
// always looks intentional (a luxury home at dusk under a deep black wash).
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=2000&q=80";

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
  const { items: featured } = await getListings({ limit: 12 });
  const popular = featured.slice(0, 8);
  const recent = featured.slice(0, 6);
  const more = (featured.length > 6 ? featured.slice(6) : featured).slice(0, 5);

  return (
    <div className="flex flex-col gap-16">
      {/* ===== HERO ===== */}
      <section
        className="full-bleed relative -mt-8 flex min-h-[90vh] items-center overflow-hidden bg-[#0b0a08] text-white"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(8,7,5,0.35) 0%, rgba(8,7,5,0.3) 45%, rgba(8,7,5,0.62) 100%), url(${HERO_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* soft vignette */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_45%,rgba(0,0,0,0.35)_100%)]" />
        {/* single soft gold glow — subtle, not muddy */}
        <div className="animate-float-slow pointer-events-none absolute -top-24 right-[14%] h-96 w-96 rounded-full bg-[var(--accent)]/15 blur-[150px]" />

        <div className="relative mx-auto w-full max-w-6xl px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {t("home.heroBadge")}
            </span>

            <h1 className="animate-fade-up mt-6 text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-7xl" style={{ animationDelay: "0.08s" }}>
              {t("home.heroTitle1")}{" "}
              <span className="text-shimmer bg-gradient-to-r from-amber-200 via-[#f0a86a] to-amber-200 bg-clip-text text-transparent">
                {t("home.heroTitle2")}
              </span>
              .
            </h1>

            <p className="animate-fade-up mx-auto mt-6 max-w-xl text-lg text-white/75" style={{ animationDelay: "0.16s" }}>
              {t("home.heroSubtitle")}
            </p>

            <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.24s" }}>
              <Link href="/listings/new" className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-[var(--foreground)] shadow-lg shadow-black/20 transition hover:-translate-y-0.5">
                {t("home.listYourProperty")}
                <Arrow />
              </Link>
              <a href="#listings" className="hidden items-center rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10 sm:inline-flex">
                {t("home.browseListings")}
              </a>
            </div>
          </div>

          <div className="animate-fade-up mx-auto mt-10 max-w-3xl" style={{ animationDelay: "0.4s" }}>
            <div className="rounded-2xl shadow-2xl shadow-black/40">
              <MarketplaceFilters initial={{}} variant="compact" />
            </div>
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
                className="group relative flex aspect-[5/4] flex-col justify-end overflow-hidden rounded-2xl bg-[#1b1813] p-4 text-white"
                style={
                  featured[i]?.media?.[0]?.url
                    ? {
                        backgroundImage: `linear-gradient(to top, rgba(27,24,19,0.88), rgba(27,24,19,0.15)), url(${featured[i].media[0].url})`,
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
      <section className="property-cta full-bleed relative isolate overflow-hidden bg-[#17140f] text-white">
        <div aria-hidden="true" className="property-cta__grid pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="property-cta__glow property-cta__glow--one pointer-events-none absolute rounded-full" />
        <div aria-hidden="true" className="property-cta__glow property-cta__glow--two pointer-events-none absolute rounded-full" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
          <Reveal className="property-cta__reveal">
            <div className="property-cta__panel grid items-center gap-7 rounded-[1.75rem] border border-white/10 bg-[#211b15] p-5 pb-8 shadow-2xl shadow-black/20 backdrop-blur-sm sm:gap-9 sm:rounded-[2rem] sm:p-8 sm:pb-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-12 lg:p-12">
              <div className="property-cta__copy">
                <span className="property-cta__eyebrow inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 sm:text-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="property-cta__pulse absolute inline-flex h-full w-full rounded-full bg-[#f0a86a] opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f0a86a]" />
                  </span>
                  For owners &amp; brokers · Always free
                </span>
                <h2 className="property-cta__title mt-5 max-w-xl text-[2.15rem] font-extrabold leading-[1.04] tracking-[-0.045em] sm:mt-6 sm:text-5xl lg:text-[3.65rem]">
                  Ready to list your <span className="property-cta__highlight">property?</span>
                </h2>
                <p className="property-cta__description mt-4 max-w-lg text-[15px] leading-7 text-white/70 sm:mt-5 sm:text-base sm:leading-7">
                  It’s free. Add your plot, home or land, drop a map pin, and reach buyers across India. Your contact details stay private.
                </p>

                <div className="property-cta__actions mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap">
                  <Link href="/listings/new" className="property-cta__primary group inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#f0a86a] px-6 py-3.5 text-[15px] font-bold text-[#21170f] shadow-lg shadow-[#e0813f]/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#ffc28e] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffc28e] active:translate-y-0 sm:min-h-12 sm:px-6">
                    Start your free listing <Arrow />
                  </Link>
                  <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/90 transition duration-300 hover:border-white/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:bg-white/15">
                    Create an account
                  </Link>
                </div>

                <div className="property-cta__trust mt-5 flex items-center justify-center gap-2 text-xs text-white/55 sm:mt-6 sm:justify-start sm:text-sm">
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-[#f0a86a]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3.5" y="8.5" width="13" height="9" rx="2" />
                    <path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5M10 12v2" />
                  </svg>
                  Your phone number stays private
                </div>
              </div>

              <div aria-hidden="true" className="property-cta__visual relative mx-auto w-full max-w-[27rem] lg:max-w-none">
                <div className="property-cta__map relative aspect-[1.58] overflow-hidden rounded-[1.35rem] border border-white/15 sm:rounded-[1.65rem]">
                  <svg viewBox="0 0 440 280" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
                    <defs>
                      <pattern id="cta-map-grid" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
                        <path d="M 34 0 L 0 0 0 34" fill="none" stroke="rgba(255,255,255,.075)" strokeWidth="1" />
                      </pattern>
                      <linearGradient id="cta-map-wash" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#554233" />
                        <stop offset="1" stopColor="#25221e" />
                      </linearGradient>
                    </defs>
                    <rect width="440" height="280" fill="url(#cta-map-wash)" />
                    <rect width="440" height="280" fill="url(#cta-map-grid)" />
                    <path d="M-10 218C66 174 113 240 183 194S293 168 450 207" fill="none" stroke="rgba(240,168,106,.25)" strokeWidth="18" />
                    <path d="M-10 218C66 174 113 240 183 194S293 168 450 207" fill="none" stroke="rgba(255,232,201,.58)" strokeWidth="2" strokeDasharray="5 8" />
                    <path d="M67 -12C118 57 96 89 156 133S209 217 204 294M307 -20C283 47 330 78 302 132S349 218 331 296" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
                    <path d="M38 70h45m-18-13 18 13-18 13M365 94h37m-15-11 15 11-15 11" fill="none" stroke="rgba(255,255,255,.23)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle className="property-cta__ripple" cx="220" cy="132" r="53" fill="rgba(240,168,106,.09)" />
                    <circle cx="220" cy="132" r="38" fill="rgba(240,168,106,.12)" />
                    <path className="property-cta__pin" d="M220 107c-12.2 0-22 9.6-22 21.5 0 16.2 22 38.5 22 38.5s22-22.3 22-38.5c0-11.9-9.8-21.5-22-21.5Z" fill="#f0a86a" />
                    <circle cx="220" cy="129" r="7" fill="#281a10" />
                  </svg>
                  <div className="property-cta__map-label absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#17140f]/70 px-3 py-2 text-[10px] font-semibold tracking-[0.12em] text-white/80 backdrop-blur sm:left-4 sm:top-4 sm:text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f0a86a]" />
                    YOUR PROPERTY, ON THE MAP
                  </div>
                  <div className="property-cta__map-foot absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-white/10 bg-[#17140f]/70 px-3 py-2.5 backdrop-blur sm:bottom-4 sm:left-4 sm:right-4 sm:px-4 sm:py-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50 sm:text-[11px]">Reach buyers</p>
                      <p className="mt-0.5 text-xs font-semibold text-white sm:text-sm">Across India</p>
                    </div>
                    <span className="rounded-full bg-[#f0a86a]/15 px-3 py-1.5 text-[10px] font-semibold text-[#ffc28e] sm:text-xs">Free to list</span>
                  </div>
                </div>
                <div className="property-cta__private-card absolute -bottom-3 right-2 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-[#27221c] px-3 py-2.5 shadow-xl shadow-black/30 sm:-bottom-4 sm:right-4 sm:gap-3 sm:px-4 sm:py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0a86a]/15 text-[#ffc28e] sm:h-10 sm:w-10">
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3.5" y="8.5" width="13" height="9" rx="2" />
                      <path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5M10 12v2" />
                    </svg>
                  </span>
                  <span className="pr-1 text-left">
                    <span className="block text-[10px] font-medium text-white/50 sm:text-[11px]">Contact details</span>
                    <span className="mt-0.5 block text-xs font-semibold text-white sm:text-sm">Private by default</span>
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
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
