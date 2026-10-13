import { randomBytes } from "node:crypto";

/** URL-safe public slug: kebab-cased title + short random suffix for uniqueness. */
export function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");

  const suffix = randomBytes(4).toString("hex");
  return `${base || "listing"}-${suffix}`;
}
