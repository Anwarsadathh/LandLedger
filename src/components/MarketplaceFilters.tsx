"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/Combobox";
import { STATE_NAMES, citiesForState } from "@/lib/states-data";
import { LISTING_TYPES } from "@/server/domain/enums";
import { LISTING_TYPE_LABELS } from "@/lib/format";
import { useT } from "@/components/i18n/LanguageProvider";

export type FilterValues = {
  q?: string;
  state?: string;
  city?: string;
  type?: string;
  priceMin?: string;
  priceMax?: string;
};

export function MarketplaceFilters({
  initial,
  variant = "full",
  basePath = "/",
}: {
  initial: FilterValues;
  variant?: "full" | "compact";
  basePath?: string;
}) {
  const router = useRouter();
  const t = useT();
  const [q, setQ] = useState(initial.q ?? "");
  const [state, setState] = useState(initial.state ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [type, setType] = useState(initial.type ?? "");
  const [priceMin, setPriceMin] = useState(initial.priceMin ?? "");
  const [priceMax, setPriceMax] = useState(initial.priceMax ?? "");
  const [open, setOpen] = useState(false); // mobile: filters collapsed by default

  function apply() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (state) p.set("state", state);
    if (city) p.set("city", city);
    if (type) p.set("type", type);
    if (priceMin) p.set("priceMin", priceMin);
    if (priceMax) p.set("priceMax", priceMax);
    const qs = p.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function clear() {
    setQ("");
    setState("");
    setCity("");
    setType("");
    setPriceMin("");
    setPriceMax("");
    router.push(basePath);
  }

  const hasFilters = q || state || city || type || priceMin || priceMax;
  const activeCount = [q, state, city, type, priceMin, priceMax].filter(Boolean).length;

  // ---------- compact hero bar ----------
  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2.5 sm:flex-row sm:items-center">
        {/* search pill + mobile action button */}
        <div className="flex items-center gap-2 sm:flex-1">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-[var(--background)] px-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder={t("filter.searchPlaceholder")}
              className="w-full bg-transparent py-2.5 text-sm text-[var(--foreground)] outline-none"
            />
          </div>
          {/* mobile-only: sliders / filter icon button */}
          <button
            onClick={apply}
            aria-label="Filters"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--background)] text-[var(--foreground)] sm:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="8" x2="20" y2="8" />
              <circle cx="15" cy="8" r="2.4" fill="var(--background)" />
              <line x1="4" y1="16" x2="20" y2="16" />
              <circle cx="9" cy="16" r="2.4" fill="var(--background)" />
            </svg>
          </button>
        </div>

        {/* desktop-only: inline filters */}
        <div className="hidden sm:block sm:w-40">
          <Combobox
            value={state}
            options={STATE_NAMES}
            placeholder={t("filter.anyState")}
            onChange={(v) => {
              setState(v);
              setCity("");
            }}
          />
        </div>
        <div className="hidden sm:block sm:w-40">
          <Combobox
            value={city}
            options={citiesForState(state)}
            placeholder={state ? t("filter.anyCity") : t("filter.stateFirst")}
            disabled={!state}
            onChange={setCity}
          />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input hidden sm:block sm:w-36">
          <option value="">{t("filter.anyTypeLong")}</option>
          {LISTING_TYPES.map((lt) => (
            <option key={lt} value={lt}>{LISTING_TYPE_LABELS[lt]}</option>
          ))}
        </select>
        <button onClick={apply} className="btn-primary hidden justify-center sm:inline-flex sm:px-7">
          {t("filter.search")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 sm:p-4">
      {/* mobile toggle — filters are collapsed until tapped */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between md:hidden"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          {t("filter.filter")}
          {hasFilters ? (
            <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{activeCount}</span>
          ) : null}
        </span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div className={`${open ? "mt-3 flex" : "hidden"} flex-wrap items-end gap-3 md:mt-0 md:flex`}>
      <Field label={t("filter.labelSearch")}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder={t("filter.searchShort")}
          className="input w-44"
        />
      </Field>
      <Field label={t("filter.labelState")}>
        <div className="w-44">
          <Combobox
            value={state}
            options={STATE_NAMES}
            placeholder={t("filter.anyState")}
            onChange={(v) => {
              setState(v);
              setCity("");
            }}
          />
        </div>
      </Field>
      <Field label={t("filter.labelCity")}>
        <div className="w-44">
          <Combobox
            value={city}
            options={citiesForState(state)}
            placeholder={state ? t("filter.anyCity") : t("filter.pickStateFirst")}
            disabled={!state}
            onChange={setCity}
          />
        </div>
      </Field>
      <Field label={t("filter.labelType")}>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input w-40">
          <option value="">{t("filter.anyType")}</option>
          {LISTING_TYPES.map((lt) => (
            <option key={lt} value={lt}>
              {LISTING_TYPE_LABELS[lt]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("filter.minPrice")}>
        <input value={priceMin} onChange={(e) => setPriceMin(e.target.value)} type="number" className="input w-28" />
      </Field>
      <Field label={t("filter.maxPrice")}>
        <input value={priceMax} onChange={(e) => setPriceMax(e.target.value)} type="number" className="input w-28" />
      </Field>
      <button onClick={apply} className="btn-primary h-9">
        {t("filter.filter")}
      </button>
      {hasFilters && (
        <button onClick={clear} className="btn-ghost h-9">
          {t("filter.clear")}
        </button>
      )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
      {label}
      {children}
    </label>
  );
}
