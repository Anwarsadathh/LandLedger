import { connectToDatabase } from "@/server/db/connect";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

// Readiness — verifies the database dependency (spec §10).
export async function GET() {
  try {
    await connectToDatabase();
    return ok({ status: "ready", db: "up" });
  } catch {
    return fail("NOT_READY", "Database is not reachable.", { status: 503 });
  }
}
