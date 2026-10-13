"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CONSENT_NOTICE_VERSION } from "@/lib/consent";
import { Combobox } from "@/components/Combobox";
import { STATE_NAMES, citiesForState } from "@/lib/states-data";
import { MediaUploader, type MediaItem } from "@/components/MediaUploader";
import {
  AREA_UNIT_OPTIONS,
  CATEGORIES,
  FACING_OPTIONS,
  SUBTYPES,
  type Category,
} from "@/lib/listing-options";
import type { ListingType } from "@/server/domain/enums";

type Errors = Record<string, string>;

type Form = {
  transactionType: "SALE" | "LEASE" | "";
  category: Category | "";
  assetSubtype: string;
  listingType: ListingType | "";
  // location
  state: string;
  district: string;
  subDistrict: string;
  locality: string;
  addressText: string;
  latitude: string;
  longitude: string;
  // profile
  title: string;
  description: string;
  priceMin: string;
  priceMax: string;
  priceBasis: "TOTAL" | "PER_UNIT";
  negotiable: boolean;
  areaValue: string;
  areaUnit: string;
  roadAccess: "YES" | "NO" | "UNKNOWN";
  facing: string;
  roadWidth: string;
  possessionStatus: string;
  nearbyLandmarks: string;
  // media
  media: MediaItem[];
  // contact
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  submitterRole: "OWNER" | "AUTHORISED_REP" | "BROKER";
  authority: boolean;
  consent: boolean;
};

const INITIAL: Form = {
  transactionType: "",
  category: "",
  assetSubtype: "",
  listingType: "",
  state: "",
  district: "",
  subDistrict: "",
  locality: "",
  addressText: "",
  latitude: "",
  longitude: "",
  title: "",
  description: "",
  priceMin: "",
  priceMax: "",
  priceBasis: "TOTAL",
  negotiable: true,
  areaValue: "",
  areaUnit: "SQ_FT",
  roadAccess: "UNKNOWN",
  facing: "UNKNOWN",
  roadWidth: "",
  possessionStatus: "",
  nearbyLandmarks: "",
  media: [],
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  submitterRole: "OWNER",
  authority: false,
  consent: false,
};

const STEPS = [
  { key: "basic", title: "Basic Details" },
  { key: "location", title: "Location Details" },
  { key: "profile", title: "Property Profile" },
  { key: "media", title: "Photos & Media" },
  { key: "contact", title: "Contact & Confirm" },
] as const;

const isNum = (v: string) => v.trim() !== "" && !Number.isNaN(Number(v));

function validateStep(step: number, f: Form): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!f.transactionType) e.transactionType = "Choose what you're listing for";
    if (!f.category) e.category = "Pick a property category";
    if (!f.assetSubtype) e.assetSubtype = "Pick a property type";
  }
  if (step === 1) {
    if (!f.state) e.state = "Select a state";
    if (!f.district.trim()) e.district = "District is required";
    if (!isNum(f.latitude) || Number(f.latitude) < -90 || Number(f.latitude) > 90)
      e.latitude = "Latitude must be between -90 and 90";
    if (!isNum(f.longitude) || Number(f.longitude) < -180 || Number(f.longitude) > 180)
      e.longitude = "Longitude must be between -180 and 180";
  }
  if (step === 2) {
    if (f.title.trim().length < 4) e.title = "Title must be at least 4 characters";
    if (!isNum(f.priceMin) || Number(f.priceMin) < 0 || !Number.isInteger(Number(f.priceMin)))
      e.priceMin = "Enter a whole number price";
    if (f.priceMax && (!isNum(f.priceMax) || Number(f.priceMax) < Number(f.priceMin)))
      e.priceMax = "Max must be ≥ min price";
    if (!isNum(f.areaValue) || Number(f.areaValue) <= 0) e.areaValue = "Enter the area";
    if (!f.areaUnit) e.areaUnit = "Pick a unit";
  }
  // step 3 (media) is optional — uploads are validated by the uploader itself.
  if (step === 4) {
    if (f.ownerPhone.trim().length < 6) e.ownerPhone = "A contact phone is required";
    if (!f.authority) e.authority = "Please confirm you're authorised to list";
    if (!f.consent) e.consent = "Consent is required";
  }
  return e;
}

const COMPLETENESS_FIELDS = (f: Form): boolean[] => [
  !!f.transactionType,
  !!f.listingType,
  !!f.state,
  !!f.district.trim(),
  isNum(f.latitude),
  isNum(f.longitude),
  f.title.trim().length >= 4,
  isNum(f.priceMin),
  isNum(f.areaValue),
  !!f.locality.trim(),
  f.description.trim().length > 0,
  f.media.length > 0,
  f.ownerPhone.trim().length >= 6,
  f.authority && f.consent,
];

export default function NewListingWizard() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(INITIAL);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [name, setName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setName(j.data.name))
      .catch(() => {});
  }, []);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const completeness = useMemo(() => {
    const flags = COMPLETENESS_FIELDS(form);
    return Math.round((flags.filter(Boolean).length / flags.length) * 100);
  }, [form]);

  function goNext() {
    const e = validateStep(step, form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  }
  function goBack() {
    setErrors({});
    if (step > 0) setStep(step - 1);
  }
  function jumpTo(i: number) {
    if (i <= step) {
      setErrors({});
      setStep(i);
    }
  }

  async function submit() {
    // Validate every step before sending.
    for (let s = 0; s < STEPS.length; s++) {
      const e = validateStep(s, form);
      if (Object.keys(e).length > 0) {
        setErrors(e);
        setStep(s);
        return;
      }
    }
    setSubmitting(true);
    setServerError(null);

    const payload = {
      listingType: form.listingType,
      assetSubtype: form.assetSubtype,
      transactionType: form.transactionType,
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
        roadAccess: form.roadAccess,
        facing: form.facing,
        roadWidth: form.roadWidth.trim() || undefined,
        possessionStatus: form.possessionStatus.trim() || undefined,
        nearbyLandmarks: form.nearbyLandmarks.trim() || undefined,
      },
      media: form.media.map((m) => ({ type: m.type, url: m.url })),
      ownerContact: {
        name: form.ownerName.trim() || undefined,
        phone: form.ownerPhone.trim(),
        email: form.ownerEmail.trim() || undefined,
      },
      submitterRole: form.submitterRole,
      authorityDeclarationAccepted: form.authority,
      contactConsent: { accepted: form.consent, noticeVersion: CONSENT_NOTICE_VERSION },
    };

    try {
      const res = await fetch("/api/v1/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/signin?next=/listings/new");
        return;
      }
      if (!res.ok) {
        const d = json.error?.details?.[0];
        setServerError(d ? `${d.field}: ${d.issue}` : json.error?.message ?? "Could not save listing.");
        setSubmitting(false);
        return;
      }
      await fetch(`/api/v1/listings/${json.data.id}/submit`, { method: "POST" });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
      {/* Left rail (desktop) */}
      <aside className="hidden flex-col gap-4 md:flex">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <ol className="flex flex-col">
            {STEPS.map((s, i) => {
              const state = i < step ? "done" : i === step ? "current" : "upcoming";
              return (
                <li key={s.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <StepDot state={state} index={i} />
                    {i < STEPS.length - 1 && (
                      <span className={`w-px flex-1 ${i < step ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`} />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpTo(i)}
                    disabled={i > step}
                    className={`pb-6 text-left ${i <= step ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <div className={`text-sm font-medium ${state === "upcoming" ? "text-[var(--muted)]" : ""}`}>
                      {s.title}
                    </div>
                    <div className="text-xs text-[var(--muted)]">Step {i + 1}</div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <Ring value={completeness} />
          <div>
            <p className="text-sm font-medium">Listing completeness</p>
            <p className="text-xs text-[var(--muted)]">More detail means better visibility.</p>
          </div>
        </div>
      </aside>

      {/* Right content */}
      <section>
        {/* Compact stepper (mobile) */}
        <div className="mb-4 md:hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{STEPS[step].title}</span>
            <span className="text-xs text-[var(--muted)]">
              Step {step + 1} of {STEPS.length} · {completeness}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {step > 0 ? (
          <button onClick={goBack} className="mb-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            ← Back
          </button>
        ) : (
          <Link href="/dashboard" className="mb-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            ← Cancel
          </Link>
        )}

        {step === 0 && <StepBasic form={form} set={set} errors={errors} name={name} />}
        {step === 1 && <StepLocation form={form} set={set} errors={errors} />}
        {step === 2 && <StepProfile form={form} set={set} errors={errors} />}
        {step === 3 && <StepMedia form={form} set={set} errors={errors} />}
        {step === 4 && <StepContact form={form} set={set} errors={errors} />}

        {serverError && <p className="mt-4 text-sm text-red-500">{serverError}</p>}

        <div className="mt-8">
          {step < STEPS.length - 1 ? (
            <button onClick={goNext} className="btn-primary w-full px-8 py-2.5 md:w-auto">
              Continue
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="btn-primary w-full px-8 py-2.5 md:w-auto">
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------- step panels ---------- */

type StepProps = { form: Form; set: (p: Partial<Form>) => void; errors: Errors };

function StepBasic({ form, set, errors, name }: StepProps & { name: string | null }) {
  const subtypes = form.category ? SUBTYPES[form.category] : [];
  return (
    <div>
      <Heading
        title={name ? `Welcome back ${name.split(" ")[0]}, fill out the basics` : "Fill out the basics"}
        sub="Tell us what you're listing and what kind of property it is."
      />
      <FieldBlock label="I'm looking to" error={errors.transactionType}>
        <ChipRow>
          <Chip selected={form.transactionType === "SALE"} onClick={() => set({ transactionType: "SALE" })}>Sell</Chip>
          <Chip selected={form.transactionType === "LEASE"} onClick={() => set({ transactionType: "LEASE" })}>Rent / Lease</Chip>
        </ChipRow>
      </FieldBlock>

      <FieldBlock label="What kind of property do you have?" error={errors.category}>
        <ChipRow>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              selected={form.category === c.key}
              onClick={() => set({ category: c.key, assetSubtype: "", listingType: "" })}
            >
              {c.label}
            </Chip>
          ))}
        </ChipRow>
      </FieldBlock>

      {form.category && (
        <FieldBlock label="Property type" error={errors.assetSubtype}>
          <ChipRow>
            {subtypes.map((s) => (
              <Chip
                key={s.label}
                selected={form.assetSubtype === s.label}
                onClick={() => set({ assetSubtype: s.label, listingType: s.listingType })}
              >
                {s.label}
              </Chip>
            ))}
          </ChipRow>
        </FieldBlock>
      )}
    </div>
  );
}

function StepLocation({ form, set, errors }: StepProps) {
  return (
    <div>
      <Heading title="Where is your property located?" sub="An accurate location helps you connect with the right buyers." />
      <div className="flex max-w-xl flex-col gap-4">
        <Field label="State" error={errors.state}>
          <Combobox
            value={form.state}
            options={STATE_NAMES}
            placeholder="Search your state…"
            onChange={(v) => set({ state: v, district: "" })}
          />
        </Field>
        <Field label="City / District" error={errors.district}>
          <Combobox
            value={form.district}
            options={citiesForState(form.state)}
            placeholder={form.state ? "Search your city…" : "Pick a state first"}
            disabled={!form.state}
            onChange={(v) => set({ district: v })}
          />
        </Field>
        <Field label="Circle / Tehsil / Taluk (optional)">
          <input value={form.subDistrict} onChange={(e) => set({ subDistrict: e.target.value })} className="input w-full" />
        </Field>
        <Field label="Locality / Village / Mouza (optional)">
          <input value={form.locality} onChange={(e) => set({ locality: e.target.value })} className="input w-full" />
        </Field>
        <Field label="Address / landmark (optional)">
          <input value={form.addressText} onChange={(e) => set({ addressText: e.target.value })} className="input w-full" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" error={errors.latitude}>
            <input value={form.latitude} onChange={(e) => set({ latitude: e.target.value })} className="input w-full" placeholder="25.60" inputMode="decimal" />
          </Field>
          <Field label="Longitude" error={errors.longitude}>
            <input value={form.longitude} onChange={(e) => set({ longitude: e.target.value })} className="input w-full" placeholder="85.10" inputMode="decimal" />
          </Field>
        </div>
        <p className="text-xs text-[var(--muted)]">A map pin picker (MapLibre) is coming — for now, enter the coordinates.</p>
      </div>
    </div>
  );
}

function StepProfile({ form, set, errors }: StepProps) {
  return (
    <div>
      <Heading title="Tell us about the property" sub="Price, size and a few key attributes buyers look for." />
      <div className="flex max-w-xl flex-col gap-4">
        <Field label="Listing title" error={errors.title}>
          <input value={form.title} onChange={(e) => set({ title: e.target.value })} className="input w-full" placeholder="e.g. East-facing residential plot near main road" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expected price ₹" error={errors.priceMin}>
            <input value={form.priceMin} onChange={(e) => set({ priceMin: e.target.value })} className="input w-full" inputMode="numeric" placeholder="4500000" />
          </Field>
          <Field label="Up to ₹ (optional)" error={errors.priceMax}>
            <input value={form.priceMax} onChange={(e) => set({ priceMax: e.target.value })} className="input w-full" inputMode="numeric" />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Field label="Price basis">
            <select value={form.priceBasis} onChange={(e) => set({ priceBasis: e.target.value as Form["priceBasis"] })} className="input">
              <option value="TOTAL">Total</option>
              <option value="PER_UNIT">Per unit</option>
            </select>
          </Field>
          <label className="mt-5 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.negotiable} onChange={(e) => set({ negotiable: e.target.checked })} className="h-4 w-4" />
            Negotiable
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Area" error={errors.areaValue}>
            <input value={form.areaValue} onChange={(e) => set({ areaValue: e.target.value })} className="input w-full" inputMode="decimal" placeholder="2400" />
          </Field>
          <Field label="Unit" error={errors.areaUnit}>
            <select value={form.areaUnit} onChange={(e) => set({ areaUnit: e.target.value })} className="input w-full">
              {AREA_UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Facing">
          <ChipRow>
            {FACING_OPTIONS.map((o) => (
              <Chip key={o.value} selected={form.facing === o.value} onClick={() => set({ facing: o.value })}>
                {o.label}
              </Chip>
            ))}
          </ChipRow>
        </Field>
        <Field label="Road access">
          <ChipRow>
            {(["YES", "NO", "UNKNOWN"] as const).map((v) => (
              <Chip key={v} selected={form.roadAccess === v} onClick={() => set({ roadAccess: v })}>
                {v === "YES" ? "Has road access" : v === "NO" ? "No road access" : "Not sure"}
              </Chip>
            ))}
          </ChipRow>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Road width (optional)">
            <input value={form.roadWidth} onChange={(e) => set({ roadWidth: e.target.value })} className="input w-full" placeholder="e.g. 30 ft" />
          </Field>
          <Field label="Possession (optional)">
            <input value={form.possessionStatus} onChange={(e) => set({ possessionStatus: e.target.value })} className="input w-full" placeholder="e.g. Immediate" />
          </Field>
        </div>
        <Field label="Nearby landmarks (optional)">
          <input value={form.nearbyLandmarks} onChange={(e) => set({ nearbyLandmarks: e.target.value })} className="input w-full" />
        </Field>
        <Field label="Description (optional)">
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3} className="input w-full" />
        </Field>
      </div>
    </div>
  );
}

function StepMedia({ form, set }: StepProps) {
  return (
    <div>
      <Heading title="Add photos & video" sub="Listings with media get far more enquiries. You can also skip and add them later." />
      <div className="flex max-w-xl flex-col gap-3">
        <MediaUploader value={form.media} onChange={(media) => set({ media })} />
        <p className="text-xs text-[var(--muted)]">
          Images up to 10MB, video up to 100MB. Files upload to Cloudinary; we store the secure link.
        </p>
      </div>
    </div>
  );
}

function StepContact({ form, set, errors }: StepProps) {
  return (
    <div>
      <Heading title="How should buyers reach you?" sub="Your contact details stay private — they're never shown on the public listing." />
      <div className="flex max-w-xl flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Your name (optional)">
            <input value={form.ownerName} onChange={(e) => set({ ownerName: e.target.value })} className="input w-full" />
          </Field>
          <Field label="Phone" error={errors.ownerPhone}>
            <input value={form.ownerPhone} onChange={(e) => set({ ownerPhone: e.target.value })} className="input w-full" placeholder="+91…" />
          </Field>
        </div>
        <Field label="Email (optional)">
          <input value={form.ownerEmail} onChange={(e) => set({ ownerEmail: e.target.value })} type="email" className="input w-full" />
        </Field>
        <Field label="You are the">
          <ChipRow>
            {(["OWNER", "AUTHORISED_REP", "BROKER"] as const).map((r) => (
              <Chip key={r} selected={form.submitterRole === r} onClick={() => set({ submitterRole: r })}>
                {r === "OWNER" ? "Owner" : r === "AUTHORISED_REP" ? "Authorised rep" : "Broker"}
              </Chip>
            ))}
          </ChipRow>
        </Field>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={form.authority} onChange={(e) => set({ authority: e.target.checked })} className="mt-1 h-4 w-4" />
          <span>I confirm the information is accurate and I am authorised to list this property.</span>
        </label>
        {errors.authority && <p className="-mt-2 text-xs text-red-500">{errors.authority}</p>}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={form.consent} onChange={(e) => set({ consent: e.target.checked })} className="mt-1 h-4 w-4" />
          <span>I consent to be contacted and acknowledge the privacy notice (v{CONSENT_NOTICE_VERSION}).</span>
        </label>
        {errors.consent && <p className="-mt-2 text-xs text-red-500">{errors.consent}</p>}
      </div>
    </div>
  );
}

/* ---------- shared bits ---------- */

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{sub}</p>
    </div>
  );
}

function FieldBlock({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-medium">{label}</p>
      {children}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
      {label}
      {children}
      {error && <span className="text-red-500">{error}</span>}
    </label>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        selected
          ? "border-[var(--primary)] bg-blue-50 font-medium text-[var(--primary)]"
          : "border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]"
      }`}
    >
      {children}
    </button>
  );
}

function StepDot({ state, index }: { state: "done" | "current" | "upcoming"; index: number }) {
  if (state === "done") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] text-white">
        ✓
      </span>
    );
  }
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] ${
        state === "current"
          ? "border-[var(--primary)] text-[var(--primary)]"
          : "border-[var(--border)] text-[var(--muted)]"
      }`}
    >
      {state === "current" ? <span className="h-2 w-2 rounded-full bg-[var(--primary)]" /> : index + 1}
    </span>
  );
}

function Ring({ value }: { value: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0">
      <circle cx="30" cy="30" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle
        cx="30"
        cy="30"
        r={r}
        fill="none"
        stroke="#16a34a"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 30 30)"
      />
      <text x="30" y="34" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
        {value}%
      </text>
    </svg>
  );
}
