import { Types } from "mongoose";
import { connectToDatabase } from "@/server/db/connect";
import { Enquiry } from "@/server/db/models/enquiry";
import { Listing } from "@/server/db/models/listing";
import { ApiError } from "@/lib/http";
import { MODERATOR_ROLES, hasRole } from "@/server/auth/roles";
import { recordAudit } from "@/server/modules/audit/service";
import { LEAD_STATUSES, type LeadStatus } from "@/server/domain/enums";
import type { CurrentUser } from "@/server/auth/current-user";

export type AdminEnquiry = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  status: string;
  channel: string;
  listingId: string;
  listingTitle: string | null;
  listingSlug: string | null;
  createdAt: string | null;
};

function requireMod(user: CurrentUser) {
  if (!hasRole(user.role, MODERATOR_ROLES)) {
    throw new ApiError("FORBIDDEN", "Admin / reviewer access required.", 403);
  }
}

type EnquiryRow = {
  _id: unknown;
  listingId?: unknown;
  name?: string;
  phone?: string;
  email?: string | null;
  message?: string | null;
  status?: string;
  source?: { channel?: string };
  createdAt?: Date;
};

export async function enquiryStats(user: CurrentUser): Promise<{ total: number; byStatus: Record<string, number> }> {
  requireMod(user);
  await connectToDatabase();
  const rows = await Enquiry.aggregate<{ _id: string; n: number }>([
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    byStatus[r._id] = r.n;
    total += r.n;
  }
  return { total, byStatus };
}

export async function listEnquiriesForAdmin(
  user: CurrentUser,
  filters: { status?: string; limit?: number } = {},
): Promise<AdminEnquiry[]> {
  requireMod(user);
  await connectToDatabase();

  const q: Record<string, unknown> = {};
  if (filters.status && (LEAD_STATUSES as readonly string[]).includes(filters.status)) q.status = filters.status;

  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500);
  const docs = (await Enquiry.find(q).sort({ createdAt: -1 }).limit(limit).lean()) as unknown as EnquiryRow[];

  const ids = [...new Set(docs.map((d) => String(d.listingId)).filter(Boolean))];
  const listings = (await Listing.find(
    { _id: { $in: ids.filter((i) => Types.ObjectId.isValid(i)) } },
    { title: 1, publicSlug: 1 },
  ).lean()) as unknown as { _id: unknown; title?: string; publicSlug?: string }[];
  const titleMap = new Map(listings.map((l) => [String(l._id), { title: l.title ?? null, slug: l.publicSlug ?? null }]));

  return docs.map((d) => {
    const meta = titleMap.get(String(d.listingId));
    return {
      id: String(d._id),
      name: d.name ?? "—",
      phone: d.phone ?? "",
      email: d.email ?? null,
      message: d.message ?? null,
      status: d.status ?? "NEW",
      channel: d.source?.channel ?? "WEB",
      listingId: String(d.listingId),
      listingTitle: meta?.title ?? null,
      listingSlug: meta?.slug ?? null,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
    };
  });
}

export async function updateEnquiryStatus(user: CurrentUser, id: string, status: LeadStatus): Promise<{ id: string; status: string }> {
  requireMod(user);
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
    throw new ApiError("BAD_REQUEST", "Invalid status.", 400);
  }
  await connectToDatabase();
  if (!Types.ObjectId.isValid(id)) throw new ApiError("NOT_FOUND", "Enquiry not found.", 404);

  const doc = await Enquiry.findByIdAndUpdate(id, { $set: { status } }, { new: true });
  if (!doc) throw new ApiError("NOT_FOUND", "Enquiry not found.", 404);

  await recordAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "ENQUIRY_STATUS_CHANGED",
    entityType: "Enquiry",
    entityId: id,
    metadata: { status },
  });

  return { id, status: doc.status };
}
