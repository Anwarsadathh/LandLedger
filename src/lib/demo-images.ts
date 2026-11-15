// Reliable Unsplash property photos for demo / seed data.
// (picsum.photos — the previous placeholder host — became unreachable, leaving
// every seeded listing image blank.) Each URL was verified to return 200.
const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=75`;

const BY_TYPE: Record<string, string[]> = {
  LAND_PLOT: [U("1500382017468-9049fed747ef"), U("1434725039720-aaad6dd32dfe")],
  RESIDENTIAL: [U("1570129477492-45c003edd2be"), U("1560448204-e02f11c3d0e2"), U("1512917774080-9991f1c4c750")],
  COMMERCIAL: [U("1486406146926-c627a92ad1ab"), U("1497366216548-37526070297c"), U("1448630360428-65456885c650")],
  AGRICULTURAL: [U("1625246333195-78d9c38ad449"), U("1580587771525-78b9dba3b914")],
  INDUSTRIAL: [U("1486406146926-c627a92ad1ab")],
  PROJECT_INVENTORY: [U("1560448204-e02f11c3d0e2")],
};

const FALLBACK = U("1512917774080-9991f1c4c750");

/** A stable demo photo for a listing type (index gives variety within a type). */
export function demoImageFor(listingType: string, index = 0): string {
  const arr = BY_TYPE[listingType] ?? [FALLBACK];
  return arr[index % arr.length];
}
