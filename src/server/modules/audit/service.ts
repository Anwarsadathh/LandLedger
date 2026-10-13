import { connectToDatabase } from "@/server/db/connect";
import { AuditEvent } from "@/server/db/models/audit";

export type AuditInput = {
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

/** Append one immutable audit event. Never throws into the caller's happy path. */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await connectToDatabase();
    await AuditEvent.create({ ...input, at: new Date() });
  } catch (err) {
    // Auditing must not break the primary action, but we surface the failure.
    console.error("Failed to write audit event", input.action, err);
  }
}
