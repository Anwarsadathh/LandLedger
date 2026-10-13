"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Combobox } from "@/components/Combobox";
import { MediaUploader, type MediaItem } from "@/components/MediaUploader";
import { STATE_NAMES, citiesForState } from "@/lib/states-data";
import { AREA_UNIT_OPTIONS, FACING_OPTIONS } from "@/lib/listing-options";

type EditForm = {
  title: string;
  description: string;
  priceMin: string;
  priceMax: string;
  priceBasis: "TOTAL" | "PER_UNIT";
  negotiable: boolean;
  areaValue: string;
  areaUnit: string;
  state: string;
  district: string;
  subDistrict: string;
  locality: string;
  addressText: string;
  latitude: string;
  longitude: string;
  facing: string;
  roadAccess: "YES" | "NO" | "UNKNOWN";
  roadWidth: string;
  possessionStatus: string;
  nearbyLandmarks: string;
  media: MediaItem[];
};

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [form, setForm] = useState<EditForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/admin/listings/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        if (j.error) {
          setLoadError(j.error.message ?? "Could not load listing");
          return;
        }
        const d = j.data;
        setForm({
          title: d.title ?? "",
          description: d.description ?? "",
          priceMin: String(d.price.min),
          priceMax: d.price.max != null ? String(d.price.max) : "",
          priceBasis: d.price.basis,
          negotiable: d.price.negotiable,
          areaValue: String(d.area.value),
          areaUnit: d.area.unit,
          state: d.location.state ?? "",
          district: d.location.district ?? "",
          subDistrict: d.location.subDistrict ?? "",
          locality: d.location.locality ?? "",
          addressText: d.addressText ?? "",
          latitude: String(d.location.latitude),
          longitude: String(d.location.longitude),
          facing: d.features?.facing ?? "UNKNOWN",
          roadAccess: d.features?.roadAccess ?? "UNKNOWN",
          roadWidth: d.features?.roadWidth ?? "",
          possessionStatus: d.features?.possessionStatus ?? "",
          nearbyLandmarks: d.features?.nearbyLandmarks ?? "",
          media: (d.media ?? []).map((m: { url: string; type: "PHOTO" | "VIDEO" }) => ({
            url: m.url,
            type: m.type,
          })),
        });
      })
      .catch(() => active && setLoadError("Network error loading listing"));
    return () => {
      active = false;
    };
  }, [id]);

  function set(patch: Partial<EditForm>) {
    setForm((f) => (f ? { ...f, ...patch } : f));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      price: {
        min: Number(form.priceMin),
        max: form.priceMax ? Number(form.priceMax) : undefined,
        currency: "INR",
        basis: form.priceBasis,
        negotiable: form.negotiable,
      },
      area: { value: Number(form.areaValue), unit: form.areaUnit },
      location: {
        state: form.state,
        district: form.district.trim(),
        subDistrict: form.subDistrict.trim() || undefined,
        locality: form.locality.trim() || undefined,
        addressText: form.addressText.trim() || undefined,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        pinPrecision: "USER_DROPPED_PIN",
      },
      features: {
        facing: form.facing,
        roadAccess: form.roadAccess,
        roadWidth: form.roadWidth.trim() || undefined,
        possessionStatus: form.possessionStatus.trim() || undefined,
        nearbyLandmarks: form.nearbyLandmarks.trim() || undefined,
      },
      media: form.media.map((m) => ({ type: m.type, url: m.url })),
    };
    try {
      const res = await fetch(`/api/v1/admin/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        const dtl = json.error?.details?.[0];
        setSaveError(dtl ? `${dtl.field}: ${dtl.issue}` : json.error?.message ?? "Save failed");
        setSaving(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setSaveError("Network error. Please try again.");
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-red-500">{loadError}</p>
        <Link href="/admin" className="btn-ghost mt-4 inline-flex">
          ← Back to admin
        </Link>
      </div>
    );
  }
  if (!form) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin" className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Back to admin
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Edit listing</h1>

      {saveError && <p className="mt-3 text-sm text-red-500">{saveError}</p>}

      <div className="mt-6 flex flex-col gap-5">
        <Section title="Basics">
          <Field label="Title">
            <input value={form.title} onChange={(e) => set({ title: e.target.value })} className="input w-full" />
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3} className="input w-full" />
          </Field>
        </Section>

        <Section title="Price & area">
          <Row>
            <Field label="Min price ₹"><input value={form.priceMin} onChange={(e) => set({ priceMin: e.target.value })} className="input" inputMode="numeric" /></Field>
            <Field label="Max price ₹"><input value={form.priceMax} onChange={(e) => set({ priceMax: e.target.value })} className="input" inputMode="numeric" /></Field>
            <Field label="Basis">
              <select value={form.priceBasis} onChange={(e) => set({ priceBasis: e.target.value as EditForm["priceBasis"] })} className="input">
                <option value="TOTAL">Total</option>
                <option value="PER_UNIT">Per unit</option>
              </select>
            </Field>
            <label className="mt-5 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.negotiable} onChange={(e) => set({ negotiable: e.target.checked })} className="h-4 w-4" />
              Negotiable
            </label>
          </Row>
          <Row>
            <Field label="Area"><input value={form.areaValue} onChange={(e) => set({ areaValue: e.target.value })} className="input" inputMode="decimal" /></Field>
            <Field label="Unit">
              <select value={form.areaUnit} onChange={(e) => set({ areaUnit: e.target.value })} className="input">
                {AREA_UNIT_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </Field>
          </Row>
        </Section>

        <Section title="Location">
          <Row>
            <Field label="State" className="flex-1">
              <Combobox value={form.state} options={STATE_NAMES} placeholder="Search state…" onChange={(v) => set({ state: v, district: "" })} />
            </Field>
            <Field label="City / District" className="flex-1">
              <Combobox value={form.district} options={citiesForState(form.state)} placeholder={form.state ? "Search city…" : "Pick a state first"} disabled={!form.state} onChange={(v) => set({ district: v })} />
            </Field>
          </Row>
          <Row>
            <Field label="Circle / Tehsil" className="flex-1"><input value={form.subDistrict} onChange={(e) => set({ subDistrict: e.target.value })} className="input w-full" /></Field>
            <Field label="Locality / Village" className="flex-1"><input value={form.locality} onChange={(e) => set({ locality: e.target.value })} className="input w-full" /></Field>
          </Row>
          <Field label="Address / landmark"><input value={form.addressText} onChange={(e) => set({ addressText: e.target.value })} className="input w-full" /></Field>
          <Row>
            <Field label="Latitude"><input value={form.latitude} onChange={(e) => set({ latitude: e.target.value })} className="input" inputMode="decimal" /></Field>
            <Field label="Longitude"><input value={form.longitude} onChange={(e) => set({ longitude: e.target.value })} className="input" inputMode="decimal" /></Field>
          </Row>
        </Section>

        <Section title="Attributes">
          <Row>
            <Field label="Facing">
              <select value={form.facing} onChange={(e) => set({ facing: e.target.value })} className="input">
                {FACING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Road access">
              <select value={form.roadAccess} onChange={(e) => set({ roadAccess: e.target.value as EditForm["roadAccess"] })} className="input">
                <option value="YES">Has road access</option>
                <option value="NO">No road access</option>
                <option value="UNKNOWN">Not sure</option>
              </select>
            </Field>
            <Field label="Road width"><input value={form.roadWidth} onChange={(e) => set({ roadWidth: e.target.value })} className="input" /></Field>
            <Field label="Possession"><input value={form.possessionStatus} onChange={(e) => set({ possessionStatus: e.target.value })} className="input" /></Field>
          </Row>
          <Field label="Nearby landmarks"><input value={form.nearbyLandmarks} onChange={(e) => set({ nearbyLandmarks: e.target.value })} className="input w-full" /></Field>
        </Section>

        <Section title="Photos & video">
          <MediaUploader value={form.media} onChange={(media) => set({ media })} />
        </Section>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn-primary px-8">
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link href="/admin" className="btn-ghost">Cancel</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <div className="flex flex-col gap-3">{children}</div>
    </fieldset>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3">{children}</div>;
}
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-[var(--muted)] ${className}`}>
      {label}
      {children}
    </label>
  );
}
