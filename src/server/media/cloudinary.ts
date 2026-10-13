import { createHash } from "node:crypto";
import { ApiError } from "@/lib/http";

// Signed direct-upload (handover spec §12: signed URLs, no secret in the
// browser). The server signs {folder,timestamp} with the API secret; the client
// then POSTs the file straight to Cloudinary with that signature. We only ever
// store the returned secure_url + public_id.

export const CLOUDINARY_FOLDER = "property-platform/listings";

export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export function signCloudinaryUpload(): UploadSignature {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      "MEDIA_NOT_CONFIGURED",
      "Image/video upload is not configured. Add CLOUDINARY_* to .env.local.",
      503,
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Params to sign, sorted alphabetically, then the api secret appended.
  const toSign = `folder=${CLOUDINARY_FOLDER}&timestamp=${timestamp}`;
  const signature = createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");

  return { cloudName, apiKey, timestamp, folder: CLOUDINARY_FOLDER, signature };
}
