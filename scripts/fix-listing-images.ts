/**
 * One-off: replace dead picsum.photos listing images with reliable Unsplash
 * photos. Safe to re-run (only touches media URLs that still point at picsum).
 *   npx tsx scripts/fix-listing-images.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env.production" });
loadEnv();

import mongoose from "mongoose";
import { connectToDatabase } from "@/server/db/connect";
import { Listing } from "@/server/db/models/listing";
import { demoImageFor } from "@/lib/demo-images";

async function main() {
  await connectToDatabase();
  const docs = await Listing.find({ "media.url": /picsum\.photos/ });
  let updated = 0;
  for (const doc of docs) {
    let touched = false;
    (doc.media ?? []).forEach((m, i) => {
      if (typeof m.url === "string" && m.url.includes("picsum.photos")) {
        m.url = demoImageFor(doc.listingType as string, i);
        touched = true;
      }
    });
    if (touched) {
      doc.markModified("media");
      await doc.save();
      updated++;
    }
  }
  console.log(`Updated ${updated} listing(s) with reliable images.`);
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error("fix-listing-images failed:", err);
  process.exit(1);
});
