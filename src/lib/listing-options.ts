import type { ListingType } from "@/server/domain/enums";

// Two-level picker (like 99acres): a broad category, then a finer subtype chip.
// Each subtype maps to our coarse listingType enum; the chip label is stored as
// `assetSubtype` so we keep the friendly wording without bloating the enum.

export type Category = "RESIDENTIAL" | "COMMERCIAL" | "LAND";

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: "RESIDENTIAL", label: "Residential" },
  { key: "COMMERCIAL", label: "Commercial" },
  { key: "LAND", label: "Land / Agricultural" },
];

export type SubtypeOption = { label: string; listingType: ListingType };

export const SUBTYPES: Record<Category, SubtypeOption[]> = {
  RESIDENTIAL: [
    { label: "Flat / Apartment", listingType: "RESIDENTIAL" },
    { label: "Independent House / Villa", listingType: "RESIDENTIAL" },
    { label: "Builder Floor", listingType: "RESIDENTIAL" },
    { label: "1 RK / Studio", listingType: "RESIDENTIAL" },
    { label: "Farmhouse", listingType: "RESIDENTIAL" },
    { label: "Other", listingType: "RESIDENTIAL" },
  ],
  COMMERCIAL: [
    { label: "Office Space", listingType: "COMMERCIAL" },
    { label: "Shop / Showroom", listingType: "COMMERCIAL" },
    { label: "Warehouse / Godown", listingType: "COMMERCIAL" },
    { label: "Industrial Shed", listingType: "INDUSTRIAL" },
    { label: "Other", listingType: "COMMERCIAL" },
  ],
  LAND: [
    { label: "Residential Plot", listingType: "LAND_PLOT" },
    { label: "Commercial Plot", listingType: "LAND_PLOT" },
    { label: "Agricultural Land", listingType: "AGRICULTURAL" },
    { label: "Farm Land", listingType: "AGRICULTURAL" },
    { label: "Industrial Land", listingType: "INDUSTRIAL" },
  ],
};

export const AREA_UNIT_OPTIONS: { value: string; label: string }[] = [
  { value: "SQ_FT", label: "Sq ft" },
  { value: "SQ_YD", label: "Sq yd" },
  { value: "SQ_M", label: "Sq m" },
  { value: "ACRE", label: "Acre" },
  { value: "HECTARE", label: "Hectare" },
  { value: "DECIMAL", label: "Decimal" },
  { value: "KATHA", label: "Katha" },
  { value: "BIGHA", label: "Bigha" },
];

export const FACING_OPTIONS: { value: string; label: string }[] = [
  { value: "EAST", label: "East" },
  { value: "WEST", label: "West" },
  { value: "NORTH", label: "North" },
  { value: "SOUTH", label: "South" },
  { value: "NORTH_EAST", label: "North-East" },
  { value: "NORTH_WEST", label: "North-West" },
  { value: "SOUTH_EAST", label: "South-East" },
  { value: "SOUTH_WEST", label: "South-West" },
  { value: "UNKNOWN", label: "Not sure" },
];
