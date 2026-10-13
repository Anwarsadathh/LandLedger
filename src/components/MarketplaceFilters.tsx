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

export function MarketplaceFilters({ initial }: { initial: FilterValues }) {
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
    router.push(qs ? `/?${qs}` : "/");
  }

  function clear() {
    setQ("");
    setState("");
    setCity("");
    setType("");
    setPriceMin("");
    setPriceMax("");
    router.push("/");
  }

  const hasFilters = q || state || city || type || priceMin || priceMax;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
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
