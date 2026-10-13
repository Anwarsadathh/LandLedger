/**
 * Seed demo data. Usage:
 *   1. Copy .env.example -> .env.local and set MONGODB_URI
 *   2. npm run seed
 *
 * Idempotent: listings are matched by title and skipped if already present.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); // dev
loadEnv({ path: ".env.production" }); // server
loadEnv(); // fall back to .env (dotenv does not override already-set keys)

import mongoose from "mongoose";
import { connectToDatabase } from "@/server/db/connect";
import { Listing } from "@/server/db/models/listing";
import { User } from "@/server/db/models/user";
import { CONSENT_NOTICE_VERSION } from "@/lib/consent";
import { makeSlug } from "@/lib/slug";
import { hashPassword } from "@/server/auth/password";

type SeedListing = {
  title: string;
  publish: boolean;
  data: Record<string, unknown>;
};

function listing(
  title: string,
  publish: boolean,
  o: {
    listingType: string;
    transactionType: string;
    description: string;
    priceMin: number;
    priceMax?: number;
    areaValue: number;
    areaUnit: string;
    normalizedSqFt?: number;
    state: string;
    district: string;
    locality: string;
    lat: number;
    lng: number;
    photoSeed: string;
    ownerName: string;
    ownerPhone: string;
    assetSubtype?: string;
  },
): SeedListing {
  return {
    title,
    publish,
    data: {
      title,
      listingType: o.listingType,
      assetSubtype: o.assetSubtype,
      transactionType: o.transactionType,
      description: o.description,
      price: { min: o.priceMin, max: o.priceMax, currency: "INR", basis: "TOTAL", negotiable: true },
      area: { value: o.areaValue, unit: o.areaUnit, normalizedSqFt: o.normalizedSqFt },
      location: {
        state: o.state,
        district: o.district,
        locality: o.locality,
        latitude: o.lat,
        longitude: o.lng,
        pinPrecision: "USER_DROPPED_PIN",
        geo: { type: "Point", coordinates: [o.lng, o.lat] },
      },
      features: { roadAccess: "YES", facing: "EAST" },
      media: [{ type: "PHOTO", url: `https://picsum.photos/seed/${o.photoSeed}/800/500` }],
      ownerContact: { name: o.ownerName, phone: o.ownerPhone },
      submitterRole: "OWNER",
      authorityDeclarationAccepted: true,
      contactConsent: { accepted: true, noticeVersion: CONSENT_NOTICE_VERSION, acceptedAt: new Date() },
      createdById: "demo-owner",
      createdByRole: "OWNER",
    },
  };
}

const SEED: SeedListing[] = [
  listing("Residential plot near Rajarajeshwari Nagar", true, {
    listingType: "LAND_PLOT",
    transactionType: "SALE",
    description: "DTCP-layout residential plot, east-facing, clear road access. Walk to main road.",
    priceMin: 4_500_000,
    priceMax: 5_000_000,
    areaValue: 2400,
    areaUnit: "SQ_FT",
    normalizedSqFt: 2400,
    state: "Karnataka",
    district: "Bengaluru Urban",
    locality: "RR Nagar",
    lat: 12.9237,
    lng: 77.5189,
    photoSeed: "plot-blr",
    ownerName: "Suresh K",
    ownerPhone: "+919800000001",
  }),
  listing("Commercial corner plot on NH-22, Patna outskirts", true, {
    listingType: "COMMERCIAL",
    transactionType: "SALE",
    description: "Corner plot with highway frontage, suitable for retail/warehouse. Negotiable.",
    priceMin: 9_800_000,
    areaValue: 6000,
    areaUnit: "SQ_FT",
    normalizedSqFt: 6000,
    state: "Bihar",
    district: "Patna",
    locality: "Fatuha",
    lat: 25.5097,
    lng: 85.3045,
    photoSeed: "plot-patna",
    ownerName: "Anil Verma",
    ownerPhone: "+919800000002",
  }),
  listing("Agricultural land, 2 acres in Vaishali", false, {
    listingType: "AGRICULTURAL",
    transactionType: "SALE",
    description: "Two acres irrigated agricultural land, mouza-level identifiers available on request.",
    priceMin: 1_200_000,
    areaValue: 2,
    areaUnit: "ACRE",
    normalizedSqFt: 87120,
    state: "Bihar",
    district: "Vaishali",
    locality: "Hajipur",
    lat: 25.6855,
    lng: 85.2122,
    photoSeed: "land-vaishali",
    ownerName: "Ramesh Singh",
    ownerPhone: "+919800000003",
  }),
  listing("2 BHK flat near GS Road, Guwahati", true, {
    listingType: "RESIDENTIAL",
    assetSubtype: "Flat / Apartment",
    transactionType: "SALE",
    description: "Well-lit 2 BHK in a gated apartment, covered parking, 24x7 water and security.",
    priceMin: 4_800_000,
    areaValue: 1150,
    areaUnit: "SQ_FT",
    normalizedSqFt: 1150,
    state: "Assam",
    district: "Guwahati",
    locality: "GS Road",
    lat: 26.1445,
    lng: 91.7362,
    photoSeed: "flat-guwahati",
    ownerName: "Pranab Das",
    ownerPhone: "+919800000004",
  }),
  listing("Office space for lease on SG Highway, Ahmedabad", true, {
    listingType: "COMMERCIAL",
    assetSubtype: "Office Space",
    transactionType: "LEASE",
    description: "1,500 sq ft fitted office on SG Highway, lift, power backup. Monthly lease, negotiable.",
    priceMin: 90_000,
    areaValue: 1500,
    areaUnit: "SQ_FT",
    normalizedSqFt: 1500,
    state: "Gujarat",
    district: "Ahmedabad",
    locality: "SG Highway",
    lat: 23.0225,
    lng: 72.5714,
    photoSeed: "office-ahmedabad",
    ownerName: "Mehul Shah",
    ownerPhone: "+919800000005",
  }),
  listing("Independent house, 3 BHK in Gaya", true, {
    listingType: "RESIDENTIAL",
    assetSubtype: "Independent House / Villa",
    transactionType: "SALE",
    description: "Independent 3 BHK house on a 1,800 sq ft plot, east-facing, clear title with the owner.",
    priceMin: 6_500_000,
    areaValue: 1800,
    areaUnit: "SQ_FT",
    normalizedSqFt: 1800,
    state: "Bihar",
    district: "Gaya",
    locality: "AP Colony",
    lat: 24.7955,
    lng: 85.0002,
    photoSeed: "house-gaya",
    ownerName: "Sunil Kumar",
    ownerPhone: "+919800000006",
  }),
];

async function main() {
  await connectToDatabase();

  // Demo accounts (password reset on each run so the logins below always work).
  const OWNER_PW = "owner12345";
  const ADMIN_PW = "admin12345";
  const owner = await upsertUser("owner@demo.local", "Demo Owner", "OWNER", OWNER_PW);
  await upsertUser("admin@demo.local", "Demo Admin", "ADMIN", ADMIN_PW);
  const ownerId = String(owner._id);

  let created = 0;
  let skipped = 0;
  for (const s of SEED) {
    const exists = await Listing.findOne({ title: s.title });
    if (exists) {
      skipped++;
      continue;
    }
    const base = { ...s.data, createdById: ownerId, createdByRole: "OWNER" };
    if (s.publish) {
      Object.assign(base, {
        workflowStatus: "PUBLISHED",
        publicSlug: makeSlug(s.title),
        publishedAt: new Date(),
        reviewHistory: [
          { to: "DRAFT", actorId: "demo-owner", actorRole: "OWNER", at: new Date() },
          { from: "DRAFT", to: "SUBMITTED", actorId: "demo-owner", actorRole: "OWNER", at: new Date() },
          { from: "SUBMITTED", to: "APPROVED_TO_PUBLISH", actorId: "demo-admin", actorRole: "ADMIN", at: new Date() },
          { from: "APPROVED_TO_PUBLISH", to: "PUBLISHED", actorId: "demo-admin", actorRole: "ADMIN", at: new Date() },
        ],
      });
    } else {
      Object.assign(base, {
        workflowStatus: "SUBMITTED",
        reviewHistory: [
          { to: "DRAFT", actorId: "demo-owner", actorRole: "OWNER", at: new Date() },
          { from: "DRAFT", to: "SUBMITTED", actorId: "demo-owner", actorRole: "OWNER", at: new Date() },
        ],
      });
    }
    await Listing.create(base);
    created++;
  }

  // Ensure demo listings belong to the demo owner (so they appear on the owner
  // dashboard even if an earlier run created them with a different owner id).
  await Listing.updateMany(
    { title: { $in: SEED.map((s) => s.title) } },
    { $set: { createdById: ownerId, createdByRole: "OWNER" } },
  );

  // States are stored as full names now — normalize any legacy codes.
  await Listing.updateMany({ "location.state": "IN-KA" }, { $set: { "location.state": "Karnataka" } });
  await Listing.updateMany({ "location.state": "IN-BR" }, { $set: { "location.state": "Bihar" } });

  console.log(`Seed complete — created ${created}, skipped ${skipped} existing.`);
  console.log("\nDemo logins:");
  console.log(`  Owner  ->  owner@demo.local  /  ${OWNER_PW}`);
  console.log(`  Admin  ->  admin@demo.local  /  ${ADMIN_PW}`);
  await mongoose.disconnect();
}

async function upsertUser(email: string, name: string, role: string, password: string) {
  const passwordHash = await hashPassword(password);
  const doc = await User.findOneAndUpdate(
    { email },
    { $set: { name, role, status: "ACTIVE", passwordHash } },
    { upsert: true, new: true },
  );
  return doc!;
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
