"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/Combobox";
import { STATE_NAMES, citiesForState } from "@/lib/states-data";
import { LISTING_TYPES } from "@/server/domain/enums";
import { LISTING_TYPE_LABELS } from "@/lib/format";

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
  const [q, setQ] = useState(initial.q ?? "");
  const [state, setState] = useState(initial.state ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [type, setType] = useState(initial.type ?? "");
  const [priceMin, setPriceMin] = useState(initial.priceMin ?? "");
  const [priceMax, setPriceMax] = useState(initial.priceMax ?? "");

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
              placeholder="Search city, locality or title"
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
            placeholder="Any state"
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
            placeholder={state ? "Any city" : "State first"}
            disabled={!state}
            onChange={setCity}
          />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input hidden sm:block sm:w-36">
          <option value="">Any type</option>
          {LISTING_TYPES.map((t) => (
            <option key={t} value={t}>{LISTING_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <button onClick={apply} className="btn-primary hidden justify-center sm:inline-flex sm:px-7">
          Search
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <Field label="Search">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="Title or description"
          className="input w-44"
        />
      </Field>
      <Field label="State">
        <div className="w-44">
          <Combobox
            value={state}
            options={STATE_NAMES}
            placeholder="Any state"
            onChange={(v) => {
              setState(v);
              setCity("");
            }}
          />
        </div>
      </Field>
      <Field label="City">
        <div className="w-44">
          <Combobox
            value={city}
            options={citiesForState(state)}
            placeholder={state ? "Any city" : "Pick a state first"}
            disabled={!state}
            onChange={setCity}
          />
        </div>
      </Field>
      <Field label="Type">
        <select value={type} onChange={(e) => setType(e.target.value)} className="input w-40">
          <option value="">Any</option>
          {LISTING_TYPES.map((t) => (
            <option key={t} value={t}>
              {LISTING_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Min price (₹)">
        <input value={priceMin} onChange={(e) => setPriceMin(e.target.value)} type="number" className="input w-28" />
      </Field>
      <Field label="Max price (₹)">
        <input value={priceMax} onChange={(e) => setPriceMax(e.target.value)} type="number" className="input w-28" />
      </Field>
      <button onClick={apply} className="btn-primary h-9">
        Filter
      </button>
      {hasFilters && (
        <button onClick={clear} className="btn-ghost h-9">
          Clear
        </button>
      )}
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
