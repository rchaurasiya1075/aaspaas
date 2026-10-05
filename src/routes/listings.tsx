import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell, useAas } from "@/components/app-shell";
import { RangeMap } from "@/components/range-map";
import {
  deleteListing,
  listMyListings,
  listMyLeads,
  saveListing,
  setListingAvailable,
  type Lead,
  type Listing,
} from "@/lib/aaspaas.functions";
import { Bath, Car, Droplets, Wifi } from "lucide-react";
import { AMENITIES, FURNISHING, ROOM_TYPES, amenityLabels, formatInr, formatPhone, furnishingLabel, roomLabel } from "@/lib/copy";
import type { FurnishingId, RoomTypeId } from "@/lib/copy";
import { JAIPUR, SPOTS } from "@/lib/geo";

export const Route = createFileRoute("/listings")({ component: ListingsPage });

function ListingsPage() {
  return (
    <AppShell>
      <Listings />
    </AppShell>
  );
}

const empty = {
  id: "" as string | undefined,
  title: "",
  roomType: "room" as RoomTypeId,
  rentInr: "",
  furnishing: "semi" as FurnishingId,
  description: "",
  address: "",
  contactName: "",
  contactPhone: "",
  depositInr: "",
  houseNo: "",
  area: "",
  city: "",
  pincode: "",
  amenities: [] as string[],
  photos: [] as string[],
};

const AMENITY_ICON = { parking: Car, wifi: Wifi, water: Droplets, bath: Bath } as const;

function Listings() {
  const { profile } = useAas();
  const [rows, setRows] = useState<Listing[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState(empty);
  const [lat, setLat] = useState(profile?.lat ?? JAIPUR.lat);
  const [lng, setLng] = useState(profile?.lng ?? JAIPUR.lng);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [data, inquiries] = await Promise.all([listMyListings(), listMyLeads()]);
    setRows(data);
    setLeads(inquiries);
  }

  useEffect(() => {
    void load().catch(() => setError("कमरे लोड नहीं हुए।"));
  }, []);

  useEffect(() => {
    if (!form.id && profile) {
      setForm((f) => ({
        ...f,
        address: f.address || profile.address,
        contactName: f.contactName || profile.displayName,
        contactPhone: f.contactPhone || profile.phone,
      }));
      if (profile.lat != null && profile.lng != null) {
        setLat(profile.lat);
        setLng(profile.lng);
      }
    }
  }, [profile, form.id]);

  function patchPhotos(files: FileList | null, current: string[], set: (photos: string[]) => void) {
  if (!files?.length) return;
  const next = [...current];
  const readers = Array.from(files).slice(0, 3 - next.length);
  for (const file of readers) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 640 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      next.push(canvas.toDataURL("image/jpeg", 0.65));
      set(next.slice(0, 3));
    };
    img.src = url;
  }
}

  function patch<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveListing({
      data: {
        id: form.id || undefined,
        title: form.title,
        roomType: form.roomType,
        rentInr: Number(form.rentInr),
        furnishing: form.furnishing,
        description: form.description,
        address: form.address,
        lat,
        lng,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        depositInr: Number(form.depositInr) || 0,
        amenities: form.amenities.join(","),
        houseNo: form.houseNo,
        area: form.area,
        city: form.city,
        pincode: form.pincode,
        photos: form.photos,
      },
    }).catch(() => ({ ok: false as const, error: "सेव नहीं हो सका।" }));
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "सेव नहीं हो सका।");
      return;
    }
    setForm(empty);
    toast("कमरा सेव हो गया");
    await load();
  }

  if (!profile) {
    return (
      <section className="rounded-card border border-line bg-card p-5">
        <h1 className="font-display text-3xl">पहले प्रोफ़ाइल।</h1>
        <Link to="/profile" className="mt-4 inline-flex h-12 items-center rounded-full bg-ink px-5 text-paper">
          प्रोफ़ाइल खोलें
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">कमरे</h1>
        <p className="mt-1 text-sm text-muted">
          कमरा आपकी पिन पर बैठता है। किरायेदार दोनों रेंजों के अंदर आने पर आपका नंबर पाता है।
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-card border border-line bg-card p-4">
        <h2 className="font-display text-2xl">{form.id ? "कमरा बदलें" : "नया कमरा"}</h2>
        <input
          value={form.title}
          onChange={(e) => patch("title", e.target.value)}
          placeholder="शीर्षक, जैसे सी-स्कीम स्टूडियो"
          className="h-12 w-full rounded-2xl border border-line bg-paper px-4"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.roomType}
            onChange={(e) => patch("roomType", e.target.value as RoomTypeId)}
            className="h-12 rounded-2xl border border-line bg-paper px-3"
          >
            {ROOM_TYPES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={form.furnishing}
            onChange={(e) => patch("furnishing", e.target.value as FurnishingId)}
            className="h-12 rounded-2xl border border-line bg-paper px-3"
          >
            {FURNISHING.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <input
          inputMode="numeric"
          value={form.rentInr}
          onChange={(e) => patch("rentInr", e.target.value)}
          placeholder="महीने का किराया, ₹"
          className="h-12 w-full rounded-2xl border border-line bg-paper px-4"
        />
        <input
          inputMode="numeric"
          value={form.depositInr}
          onChange={(e) => patch("depositInr", e.target.value)}
          placeholder="सिक्योरिटी डिपॉजिट, ₹"
          className="h-12 w-full rounded-2xl border border-line bg-paper px-4"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={form.houseNo}
            onChange={(e) => patch("houseNo", e.target.value)}
            placeholder="मकान नंबर / लैंडमार्क"
            className="h-12 rounded-2xl border border-line bg-paper px-4"
          />
          <input
            value={form.area}
            onChange={(e) => patch("area", e.target.value)}
            placeholder="इलाका"
            className="h-12 rounded-2xl border border-line bg-paper px-4"
          />
          <input
            value={form.city}
            onChange={(e) => patch("city", e.target.value)}
            placeholder="शहर"
            className="h-12 rounded-2xl border border-line bg-paper px-4"
          />
          <input
            value={form.pincode}
            onChange={(e) => patch("pincode", e.target.value)}
            placeholder="पिनकोड"
            inputMode="numeric"
            className="h-12 rounded-2xl border border-line bg-paper px-4"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {AMENITIES.map((item) => {
            const on = form.amenities.includes(item.id);
            const Icon = AMENITY_ICON[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  patch(
                    "amenities",
                    on ? form.amenities.filter((id) => id !== item.id) : [...form.amenities, item.id],
                  )
                }
                className={`flex h-11 items-center justify-center gap-2 rounded-full border text-sm ${on ? "border-ink bg-ink text-paper" : "border-line bg-paper"}`}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </div>
        <label className="block text-sm">
          फ़ोटो, ज़्यादा से ज़्यादा 3
          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-1 block w-full text-sm"
            onChange={(e) => {
              patchPhotos(e.target.files, form.photos, (photos) => patch("photos", photos));
              e.target.value = "";
            }}
          />
        </label>
        {form.photos.length ? (
          <div className="flex gap-2">
            {form.photos.map((src) => (
              <img key={src.slice(0, 40)} src={src} alt="" className="h-16 w-16 rounded-xl object-cover" />
            ))}
          </div>
        ) : null}
        <textarea
          value={form.description}
          onChange={(e) => patch("description", e.target.value)}
          rows={3}
          placeholder="थोड़ा विवरण — मंज़िल, पानी, परिवार या बैचलर"
          className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
        />
        <input
          value={form.address}
          onChange={(e) => patch("address", e.target.value)}
          placeholder="पता"
          className="h-12 w-full rounded-2xl border border-line bg-paper px-4"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={form.contactName}
            onChange={(e) => patch("contactName", e.target.value)}
            placeholder="संपर्क नाम"
            className="h-12 rounded-2xl border border-line bg-paper px-4"
          />
          <input
            value={form.contactPhone}
            onChange={(e) => patch("contactPhone", e.target.value)}
            placeholder="मोबाइल"
            inputMode="tel"
            className="h-12 rounded-2xl border border-line bg-paper px-4"
          />
        </div>
        <div className="h-64 overflow-hidden rounded-2xl border border-line">
          <RangeMap lat={lat} lng={lng} radiusKm={profile.radiusKm} pins={[]} onMove={(a, b) => { setLat(a); setLng(b); }} />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {SPOTS.map((spot) => (
            <button
              key={spot.id}
              type="button"
              className="h-11 shrink-0 rounded-full border border-line px-4 text-sm"
              onClick={() => {
                setLat(spot.lat);
                setLng(spot.lng);
              }}
            >
              {spot.name}
            </button>
          ))}
        </div>
        {error ? <p className="text-sm text-saffron">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="h-12 flex-1 rounded-full bg-ink font-medium text-paper disabled:opacity-60"
          >
            {busy ? "सेव…" : "कमरा सेव करें"}
          </button>
          {form.id ? (
            <button type="button" className="h-12 rounded-full border border-line px-4 text-sm" onClick={() => setForm(empty)}>
              रद्द
            </button>
          ) : null}
        </div>
      </form>

      <ul className="space-y-3">
        {rows.length === 0 ? <li className="text-sm text-muted">अभी कोई कमरा नहीं।</li> : null}
        {rows.map((room) => (
          <li key={room.id} className="rounded-card border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted">
                  {roomLabel(room.roomType)} · {furnishingLabel(room.furnishing)}
                  {room.available ? " · खाली" : " · भरा"}
                </p>
                <h3 className="font-display text-2xl">{room.title}</h3>
                <p className="text-sm text-muted">
                  {formatInr(room.rentInr)}
                  {room.depositInr ? ` · डिपॉजिट ${formatInr(room.depositInr)}` : ""} · {room.contactName} ·{" "}
                  {formatPhone(room.contactPhone)}
                </p>
                {amenityLabels(room.amenities).length ? (
                  <p className="text-xs text-muted">{amenityLabels(room.amenities).join(" · ")}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="h-11 rounded-full border border-line px-4 text-sm"
                onClick={() => {
                  setForm({
                    id: room.id,
                    title: room.title,
                    roomType: room.roomType as RoomTypeId,
                    rentInr: String(room.rentInr),
                    furnishing: room.furnishing as FurnishingId,
                    description: room.description,
                    address: room.address,
                    contactName: room.contactName,
                    contactPhone: room.contactPhone,
                    depositInr: room.depositInr ? String(room.depositInr) : "",
                    houseNo: room.houseNo,
                    area: room.area,
                    city: room.city,
                    pincode: room.pincode,
                    amenities: room.amenities ? room.amenities.split(",") : [],
                    photos: room.photos,
                  });
                  setLat(room.lat);
                  setLng(room.lng);
                }}
              >
                बदलें
              </button>
              <button
                type="button"
                className="h-11 rounded-full border border-line px-4 text-sm"
                onClick={() => {
                  void setListingAvailable({ data: { id: room.id, available: !room.available } }).then(load);
                }}
              >
                {room.available ? "भर गया" : "खाली है"}
              </button>
              <button
                type="button"
                className="h-11 rounded-full px-4 text-sm text-saffron"
                onClick={() => {
                  if (!window.confirm("यह कमरा हट जाए?")) return;
                  void deleteListing({ data: { id: room.id } }).then(load);
                }}
              >
                हटाएँ
              </button>
            </div>
          </li>
        ))}
      </ul>
      {leads.length ? (
        <section className="space-y-2">
          <h2 className="font-display text-2xl">रुचि</h2>
          {leads.map((lead) => (
            <article key={lead.id} className="rounded-card border border-line bg-card p-4 text-sm">
              <p className="font-medium">{lead.tenantName}</p>
              <p className="text-muted">
                {lead.listingTitle} · {formatPhone(lead.tenantPhone)}
              </p>
              <a className="mt-2 inline-flex h-10 items-center rounded-full bg-ink px-4 text-paper" href={`tel:+91${lead.tenantPhone}`}>
                कॉल
              </a>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
