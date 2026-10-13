import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

// Liveness — no dependencies touched (spec §10).
export async function GET() {
  return ok({ status: "ok", service: "property-platform", time: new Date().toISOString() });
}
