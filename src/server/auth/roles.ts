// Platform roles (handover spec §3). RBAC + record-level ownership is enforced
// server-side on every request. Phase 1 ships a stubbed identity (see
// current-user.ts) — replace with Auth.js (MongoDB adapter) + OTP before launch.

export const ROLES = [
  "PUBLIC",
  "OWNER",
  "BROKER",
  "INSIDE_SALES",
  "LISTING_REVIEWER",
  "RESEARCH_ANALYST",
  "LEGAL_REVIEWER",
  "FIELD_EXECUTIVE",
  "ADMIN",
  "SUPER_ADMIN",
] as const;
export type Role = (typeof ROLES)[number];

/** Roles allowed to moderate listings (approve / reject / request correction). */
export const MODERATOR_ROLES: readonly Role[] = [
  "LISTING_REVIEWER",
  "ADMIN",
  "SUPER_ADMIN",
];

/** Roles allowed to create listings. */
export const SUBMITTER_ROLES: readonly Role[] = [
  "OWNER",
  "BROKER",
  "ADMIN",
  "SUPER_ADMIN",
];

export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}
