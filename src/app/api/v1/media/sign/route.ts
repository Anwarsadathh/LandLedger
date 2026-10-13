import { getCurrentUser } from "@/server/auth/current-user";
import { signCloudinaryUpload } from "@/server/media/cloudinary";
import { fail, newRequestId, ok, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/v1/media/sign — issue a short-lived Cloudinary upload signature.
// Auth required so only signed-in users can get an upload grant.
export async function POST() {
  const requestId = newRequestId();
  try {
    const user = await getCurrentUser();
    if (!user) return fail("UNAUTHENTICATED", "Please sign in.", { status: 401, requestId });
    return ok(signCloudinaryUpload(), { requestId });
  } catch (err) {
    return toErrorResponse(err, requestId);
  }
}
