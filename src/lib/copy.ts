export const SEEKER_TYPES = [
  { id: "student", label: "स्टूडेंट" },
  { id: "working", label: "वर्किंग" },
  { id: "family", label: "फैमिली" },
] as const;

export const AMENITIES = [
  { id: "parking", label: "पार्किंग" },
  { id: "wifi", label: "वाई-फ़ाई" },
  { id: "water", label: "24 घंटे पानी" },
  { id: "bath", label: "अटैच्ड बाथरूम" },
] as const;

export type SeekerTypeId = (typeof SEEKER_TYPES)[number]["id"];
export type AmenityId = (typeof AMENITIES)[number]["id"];

export function seekerLabel(id: string): string {
  return SEEKER_TYPES.find((s) => s.id === id)?.label ?? "";
}

export function amenityLabels(csv: string): string[] {
  const set = new Set(csv.split(",").map((s) => s.trim()));
  return AMENITIES.filter((a) => set.has(a.id)).map((a) => a.label);
}
export const ROOM_TYPES = [
  { id: "room", label: "कमरा" },
  { id: "1bhk", label: "1 BHK" },
  { id: "2bhk", label: "2 BHK" },
  { id: "3bhk", label: "3 BHK" },
  { id: "pg", label: "PG" },
] as const;

export const FURNISHING = [
  { id: "unfurnished", label: "बिना फर्नीचर" },
  { id: "semi", label: "सेमी-फर्निश्ड" },
  { id: "furnished", label: "फर्निश्ड" },
] as const;

export type RoomTypeId = (typeof ROOM_TYPES)[number]["id"];
export type FurnishingId = (typeof FURNISHING)[number]["id"];

export function roomLabel(id: string): string {
  return ROOM_TYPES.find((r) => r.id === id)?.label ?? id;
}

export function furnishingLabel(id: string): string {
  return FURNISHING.find((r) => r.id === id)?.label ?? id;
}

export function formatInr(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPhone(ten: string): string {
  if (ten.length !== 10) return ten;
  return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
}

export function formatKm(km: number): string {
  if (km < 0.05) return "यहीं";
  const digits = km < 10 ? 1 : 0;
  return `${km.toFixed(digits)} किमी`;
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("hi-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
