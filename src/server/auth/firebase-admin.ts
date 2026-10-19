import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

// Server-side verification of Firebase phone-auth ID tokens. Credentials come
// from FIREBASE_SERVICE_ACCOUNT (inline minified JSON — use this on Vercel) or
// FIREBASE_SERVICE_ACCOUNT_PATH (a local JSON file — used in dev).

let adminApp: App | null = null;

type ServiceAccountJson = { project_id?: string; client_email?: string; private_key?: string };

function loadServiceAccount(): ServiceAccountJson | null {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  try {
    if (inline && inline.trim().startsWith("{")) return JSON.parse(inline) as ServiceAccountJson;
    if (path) return JSON.parse(readFileSync(path, "utf8")) as ServiceAccountJson;
  } catch {
    return null;
  }
  return null;
}

export function firebaseAdminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
}

function getAdminApp(): App | null {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0];
    return adminApp;
  }
  const sa = loadServiceAccount();
  if (!sa?.project_id || !sa.client_email || !sa.private_key) return null;
  adminApp = initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
  });
  return adminApp;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase admin not configured");
  return getAuth(app).verifyIdToken(idToken);
}
