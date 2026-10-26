// Display helpers. Enum → human label maps live here so the UI never shows raw
// SCREAMING_CASE values.

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPrice(price: {
  min: number;
  max?: number | null;
  currency: string;
  basis: string;
}): string {
  const fmt = (n: number) =>
    price.currency === "INR" ? inr.format(n) : `${price.currency} ${n.toLocaleString()}`;
  const range = price.max && price.max !== price.min ? `${fmt(price.min)} – ${fmt(price.max)}` : fmt(price.min);
  return price.basis === "PER_UNIT" ? `${range} / unit` : range;
}

const AREA_UNIT_LABELS: Record<string, string> = {
  SQ_FT: "sq ft",
  SQ_YD: "sq yd",
  SQ_M: "sq m",
  ACRE: "acre",
  HECTARE: "hectare",
  DECIMAL: "decimal",
  KATHA: "katha",
  BIGHA: "bigha",
};

export function formatArea(area: { value: number; unit: string; normalizedSqFt?: number | null }): string {
  const label = `${area.value.toLocaleString("en-IN")} ${AREA_UNIT_LABELS[area.unit] ?? area.unit}`;
  if (area.normalizedSqFt && area.unit !== "SQ_FT") {
    return `${label} (≈ ${area.normalizedSqFt.toLocaleString("en-IN")} sq ft)`;
  }
  return label;
}

export const LISTING_TYPE_LABELS: Record<string, string> = {
  LAND_PLOT: "Land / Plot",
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  AGRICULTURAL: "Agricultural",
  INDUSTRIAL: "Industrial",
  PROJECT_INVENTORY: "Project inventory",
};

// Content language (owner-typed, never translated). Labels shown in the native
// script so an owner recognises their own language; BCP-47 tags set `lang=` on
// the rendered title/description for correct font shaping and accessibility.
export const CONTENT_LANGUAGE_LABELS: Record<string, string> = {
  EN: "English",
  HI: "हिन्दी",
  KN: "ಕನ್ನಡ",
  ML: "മലയാളം",
};

export const CONTENT_LANGUAGE_BCP47: Record<string, string> = {
  EN: "en",
  HI: "hi",
  KN: "kn",
  ML: "ml",
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted for review",
  NEEDS_CORRECTION: "Needs correction",
  APPROVED_TO_PUBLISH: "Approved to publish",
  PUBLISHED: "Published",
  PAUSED: "Paused",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

// Indian state code → name (launch focus: Bihar + Karnataka; extend as needed).
export const STATE_LABELS: Record<string, string> = {
  "IN-BR": "Bihar",
  "IN-KA": "Karnataka",
  "IN-UP": "Uttar Pradesh",
  "IN-JH": "Jharkhand",
  "IN-WB": "West Bengal",
};

export function stateLabel(code: string): string {
  return STATE_LABELS[code] ?? code;
}
