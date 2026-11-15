// Visitor's chosen location preference, persisted in a cookie so the server
// home feed can show nearby listings first. Set client-side by HomeNearby.
export const LOC_COOKIE = "orova_loc";

export type LocPref = { state?: string; city?: string };

export function parseLoc(value: string | undefined | null): LocPref | null {
  if (!value) return null;
  try {
    const o = JSON.parse(decodeURIComponent(value));
    if (o && typeof o === "object") {
      const state = typeof o.state === "string" ? o.state : undefined;
      const city = typeof o.city === "string" ? o.city : undefined;
      if (state || city) return { state, city };
    }
  } catch {
    /* ignore malformed cookie */
  }
  return null;
}
