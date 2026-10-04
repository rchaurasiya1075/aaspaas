/** Great-circle distance in kilometres. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export const JAIPUR = { lat: 26.9124, lng: 75.7873 };

export const SPOTS = [
  { id: "c-scheme", name: "सी-स्कीम", lat: 26.9053, lng: 75.8073 },
  { id: "mi-road", name: "एमआई रोड", lat: 26.9168, lng: 75.8087 },
  { id: "malviya", name: "मालवीय नगर", lat: 26.8546, lng: 75.8242 },
  { id: "vaishali", name: "वैशाली नगर", lat: 26.9118, lng: 75.7439 },
  { id: "mansarovar", name: "मानसरोवर", lat: 26.8573, lng: 75.7693 },
  { id: "jagatpura", name: "जगतपुरा", lat: 26.8382, lng: 75.8627 },
] as const;

export function validCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
