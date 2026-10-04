import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { distanceKm, validCoord } from "@/lib/geo";
import type { FurnishingId, RoomTypeId } from "@/lib/copy";

export type Profile = {
  displayName: string;
  phone: string;
  role: "tenant" | "landlord" | "admin";
  address: string;
  lat: number | null;
  lng: number | null;
  radiusKm: number;
};

export type Match = {
  id: string;
  title: string;
  roomType: string;
  rentInr: number;
  furnishing: string;
  description: string;
  lat: number;
  lng: number;
  distanceKm: number;
  unlockKm: number;
  inRange: boolean;
  isMine: boolean;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
};

export type EnteredAlert = {
  id: string;
  title: string;
  contactName: string;
  contactPhone: string;
  rentInr: number;
  address: string;
};

export type Listing = {
  id: string;
  title: string;
  roomType: string;
  rentInr: number;
  furnishing: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  contactName: string;
  contactPhone: string;
  available: boolean;
};

export type AlertRow = {
  id: number;
  listingId: string;
  distanceM: number;
  contactName: string;
  contactPhone: string;
  title: string;
  rentInr: number;
  address: string;
  createdAt: string;
};

const ROOM = new Set(["room", "1bhk", "2bhk", "3bhk", "pg"]);
const FURN = new Set(["unfurnished", "semi", "furnished"]);

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function asBool(v: unknown): boolean {
  return v === true || v === "t" || v === "true" || v === 1;
}

export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  const ten =
    d.length === 12 && d.startsWith("91")
      ? d.slice(2)
      : d.length === 11 && d.startsWith("0")
        ? d.slice(1)
        : d;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

function clampRadius(v: unknown): number | null {
  const n = num(v);
  if (n === null) return null;
  const r = Math.round(n);
  if (r < 1 || r > 10) return null;
  return r;
}

type ProfileRow = {
  user_id: string;
  display_name: string;
  phone: string;
  role: string;
  address: string;
  lat: number | null;
  lng: number | null;
  radius_km: number;
};

function mapProfile(r: ProfileRow): Profile {
  const role = r.role === "landlord" || r.role === "admin" ? r.role : "tenant";
  return {
    displayName: r.display_name,
    phone: r.phone,
    role,
    address: r.address,
    lat: num(r.lat),
    lng: num(r.lng),
    radiusKm: num(r.radius_km) ?? 3,
  };
}

async function logActivity(sql: Sql, actorId: string, kind: string, detail: string) {
  await sql`insert into activity (actor_id, kind, detail) values (${actorId}, ${kind}, ${detail})`;
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<ProfileRow>`select user_id, display_name, phone, role, address, lat, lng, radius_km from profiles where user_id = ${context.userId}`;
    const admins = await sql<{ n: number }>`select count(*) as n from profiles where role = 'admin'`;
    return {
      profile: rows[0] ? mapProfile(rows[0]) : null,
      adminExists: Number(admins[0]?.n ?? 0) > 0,
    };
  });

type ProfileInput = {
  displayName: string;
  phone: string;
  role: "tenant" | "landlord";
  address: string;
  lat: number;
  lng: number;
  radiusKm: number;
};

export const saveProfile = createServerFn({ method: "POST" })
  .validator((data: ProfileInput) => data)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const displayName = (data?.displayName ?? "").trim();
    const phone = normalizePhone(data?.phone ?? "");
    const address = (data?.address ?? "").trim();
    const radiusKm = clampRadius(data?.radiusKm);
    const lat = num(data?.lat);
    const lng = num(data?.lng);
    const requested = data?.role === "landlord" ? "landlord" : "tenant";
    if (displayName.length < 2 || displayName.length > 60) {
      return { ok: false as const, error: "नाम 2 से 60 अक्षरों का होना चाहिए।" };
    }
    if (!phone) return { ok: false as const, error: "सही भारतीय मोबाइल नंबर डालें।" };
    if (address.length < 4 || address.length > 180) {
      return { ok: false as const, error: "पता थोड़ा और साफ़ लिखें।" };
    }
    if (radiusKm === null) return { ok: false as const, error: "रेंज 1 से 10 किलोमीटर हो।" };
    if (lat === null || lng === null || !validCoord(lat, lng)) {
      return { ok: false as const, error: "लोकेशन सेट नहीं हुई। पिन हिलाएँ या इलाका चुनें।" };
    }
    const sql = await getSql();
    const existing = await sql<{ role: string }>`select role from profiles where user_id = ${context.userId}`;
    const role = existing[0]?.role === "admin" ? "admin" : requested;
    await sql`
      insert into profiles (user_id, display_name, phone, role, address, lat, lng, radius_km)
      values (${context.userId}, ${displayName}, ${phone}, ${role}, ${address}, ${lat}, ${lng}, ${radiusKm})
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        phone = excluded.phone,
        role = excluded.role,
        address = excluded.address,
        lat = excluded.lat,
        lng = excluded.lng,
        radius_km = excluded.radius_km,
        updated_at = now()
    `;
    await logActivity(sql, context.userId, "profile_saved", `${displayName} ने प्रोफ़ाइल सेव की · ${radiusKm} किमी`);
    return { ok: true as const };
  });

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const mine = await sql<{ role: string }>`select role from profiles where user_id = ${context.userId}`;
    if (!mine[0]) return { ok: false as const, error: "पहले प्रोफ़ाइल पूरी करें।" };
    if (mine[0].role === "admin") return { ok: true as const };
    const taken = await sql<{ n: number }>`select count(*) as n from profiles where role = 'admin'`;
    if (Number(taken[0]?.n ?? 0) > 0) {
      return { ok: false as const, error: "एडमिन पहले से है।" };
    }
    const updated = await sql<{ user_id: string }>`
      update profiles set role = 'admin', updated_at = now()
      where user_id = ${context.userId}
        and not exists (select 1 from profiles where role = 'admin')
      returning user_id
    `;
    if (!updated.length) return { ok: false as const, error: "एडमिन पहले से है।" };
    await logActivity(sql, context.userId, "admin_claimed", "नए ऑपरेटर ने एडमिन क्लेम किया");
    return { ok: true as const };
  });

export const stepDownAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`
      update profiles set role = 'tenant', updated_at = now()
      where user_id = ${context.userId} and role = 'admin'
    `;
    await logActivity(sql, context.userId, "role_changed", "एडमिन ने रोल छोड़ दिया");
    return { ok: true as const };
  });

type ListingInput = {
  id?: string;
  title: string;
  roomType: RoomTypeId;
  rentInr: number;
  furnishing: FurnishingId;
  description: string;
  address: string;
  lat: number;
  lng: number;
  contactName: string;
  contactPhone: string;
};

function readListing(data: ListingInput) {
  const title = (data?.title ?? "").trim();
  const roomType = data?.roomType;
  const furnishing = data?.furnishing;
  const description = (data?.description ?? "").trim();
  const address = (data?.address ?? "").trim();
  const contactName = (data?.contactName ?? "").trim();
  const contactPhone = normalizePhone(data?.contactPhone ?? "");
  const rentInr = num(data?.rentInr);
  const lat = num(data?.lat);
  const lng = num(data?.lng);
  if (title.length < 3 || title.length > 80) return { error: "कमरे का शीर्षक 3–80 अक्षरों में लिखें।" };
  if (!ROOM.has(roomType)) return { error: "कमरे का प्रकार चुनें।" };
  if (!FURN.has(furnishing)) return { error: "फर्नीचर चुनें।" };
  if (rentInr === null || rentInr < 500 || rentInr > 500000) {
    return { error: "किराया 500 से 5,00,000 के बीच होना चाहिए।" };
  }
  if (description.length > 600) return { error: "विवरण छोटा रखें।" };
  if (address.length < 4 || address.length > 180) return { error: "कमरे का पता लिखें।" };
  if (contactName.length < 2) return { error: "संपर्क नाम लिखें।" };
  if (!contactPhone) return { error: "संपर्क के लिए सही मोबाइल नंबर डालें।" };
  if (lat === null || lng === null || !validCoord(lat, lng)) return { error: "कमरे की लोकेशन सेट करें।" };
  return {
    title,
    roomType,
    furnishing,
    description,
    address,
    contactName,
    contactPhone,
    rentInr: Math.round(rentInr),
    lat,
    lng,
  };
}

type ListingRow = {
  id: string;
  title: string;
  room_type: string;
  rent_inr: number;
  furnishing: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  contact_name: string;
  contact_phone: string;
  available: boolean;
};

function mapListing(r: ListingRow): Listing {
  return {
    id: r.id,
    title: r.title,
    roomType: r.room_type,
    rentInr: num(r.rent_inr) ?? 0,
    furnishing: r.furnishing,
    description: r.description,
    address: r.address,
    lat: num(r.lat) ?? 0,
    lng: num(r.lng) ?? 0,
    contactName: r.contact_name,
    contactPhone: r.contact_phone,
    available: asBool(r.available),
  };
}

export const listMyListings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<ListingRow>`
      select id, title, room_type, rent_inr, furnishing, description, address, lat, lng,
             contact_name, contact_phone, available
      from listings where owner_id = ${context.userId}
      order by created_at desc
    `;
    return rows.map(mapListing);
  });

export const saveListing = createServerFn({ method: "POST" })
  .validator((data: ListingInput) => data)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const parsed = readListing(data);
    if ("error" in parsed) return { ok: false as const, error: parsed.error };
    const sql = await getSql();
    const profile = await sql`select user_id from profiles where user_id = ${context.userId}`;
    if (!profile.length) return { ok: false as const, error: "पहले प्रोफ़ाइल सेव करें।" };
    const count = await sql<{ n: number }>`select count(*) as n from listings where owner_id = ${context.userId}`;
    if (!data.id && Number(count[0]?.n ?? 0) >= 30) {
      return { ok: false as const, error: "ज़्यादा से ज़्यादा 30 कमरे।" };
    }
    if (data.id) {
      const updated = await sql<{ id: string }>`
        update listings set
          title = ${parsed.title},
          room_type = ${parsed.roomType},
          rent_inr = ${parsed.rentInr},
          furnishing = ${parsed.furnishing},
          description = ${parsed.description},
          address = ${parsed.address},
          lat = ${parsed.lat},
          lng = ${parsed.lng},
          contact_name = ${parsed.contactName},
          contact_phone = ${parsed.contactPhone},
          updated_at = now()
        where id = ${data.id} and owner_id = ${context.userId}
        returning id
      `;
      if (!updated.length) return { ok: false as const, error: "यह कमरा आपका नहीं है।" };
    } else {
      const id = crypto.randomUUID();
      await sql`
        insert into listings (
          id, owner_id, title, room_type, rent_inr, furnishing, description, address,
          lat, lng, contact_name, contact_phone
        ) values (
          ${id}, ${context.userId}, ${parsed.title}, ${parsed.roomType}, ${parsed.rentInr},
          ${parsed.furnishing}, ${parsed.description}, ${parsed.address}, ${parsed.lat}, ${parsed.lng},
          ${parsed.contactName}, ${parsed.contactPhone}
        )
      `;
    }
    await logActivity(sql, context.userId, "listing_saved", `कमरा सेव: ${parsed.title}`);
    return { ok: true as const };
  });

export const setListingAvailable = createServerFn({ method: "POST" })
  .validator((data: { id: string; available: boolean }) => data)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      update listings set available = ${Boolean(data.available)}, updated_at = now()
      where id = ${data.id} and owner_id = ${context.userId}
      returning id
    `;
    if (!rows.length) return { ok: false as const, error: "कमरा नहीं मिला।" };
    return { ok: true as const };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string; title: string }>`
      delete from listings where id = ${data.id} and owner_id = ${context.userId} returning id, title
    `;
    if (!rows.length) return { ok: false as const, error: "कमरा नहीं मिला।" };
    await sql`delete from presence where listing_id = ${data.id}`;
    await logActivity(sql, context.userId, "listing_removed", `कमरा हटा: ${rows[0]?.title ?? ""}`);
    return { ok: true as const };
  });

type ScanRow = {
  id: string;
  owner_id: string;
  title: string;
  room_type: string;
  rent_inr: number;
  furnishing: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  contact_name: string;
  contact_phone: string;
  owner_radius: number;
};

export const scanRange = createServerFn({ method: "POST" })
  .validator((data: { lat: number; lng: number }) => data)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const lat = num(data?.lat);
    const lng = num(data?.lng);
    if (lat === null || lng === null || !validCoord(lat, lng)) {
      return { ok: false as const, error: "लोकेशन अमान्य है।" };
    }
    const sql = await getSql();
    const profiles = await sql<ProfileRow>`
      select user_id, display_name, phone, role, address, lat, lng, radius_km
      from profiles where user_id = ${context.userId}
    `;
    const profile = profiles[0] ? mapProfile(profiles[0]) : null;
    if (!profile || profile.lat === null || profile.lng === null) {
      return { ok: false as const, error: "needs-profile" };
    }
    const listings = await sql<ScanRow>`
      select l.id, l.owner_id, l.title, l.room_type, l.rent_inr, l.furnishing, l.description,
             l.address, l.lat, l.lng, l.contact_name, l.contact_phone, p.radius_km as owner_radius
      from listings l
      join profiles p on p.user_id = l.owner_id
      where l.available = true
    `;
    const presence = await sql<{ listing_id: string; inside: boolean }>`
      select listing_id, inside from presence where tenant_id = ${context.userId}
    `;
    const wasInside = new Map(presence.map((p) => [p.listing_id, asBool(p.inside)]));
    const entered: EnteredAlert[] = [];
    const matches: Match[] = [];

    for (const row of listings) {
      const listingLat = num(row.lat);
      const listingLng = num(row.lng);
      if (listingLat === null || listingLng === null) continue;
      const km = distanceKm(lat, lng, listingLat, listingLng);
      const ownerRadius = num(row.owner_radius) ?? 3;
      const unlockKm = Math.min(profile.radiusKm, ownerRadius);
      const inRange = km <= unlockKm;
      const prev = wasInside.get(row.id) ?? false;
      if (inRange && !prev) {
        const rent = num(row.rent_inr) ?? 0;
        await sql`
          insert into geofence_events (
            tenant_id, listing_id, distance_m, contact_name, contact_phone, listing_title, rent_inr, address
          ) values (
            ${context.userId}, ${row.id}, ${Math.round(km * 1000)}, ${row.contact_name}, ${row.contact_phone},
            ${row.title}, ${rent}, ${row.address}
          )
        `;
        await logActivity(
          sql,
          context.userId,
          "geofence_enter",
          `${profile.displayName} रेंज में आया: ${row.title} (${Math.round(km * 1000)} मी)`,
        );
        entered.push({
          id: row.id,
          title: row.title,
          contactName: row.contact_name,
          contactPhone: row.contact_phone,
          rentInr: rent,
          address: row.address,
        });
      } else if (!inRange && prev) {
        await logActivity(
          sql,
          context.userId,
          "geofence_exit",
          `${profile.displayName} रेंज से बाहर: ${row.title}`,
        );
      }
      await sql`
        insert into presence (tenant_id, listing_id, inside)
        values (${context.userId}, ${row.id}, ${inRange})
        on conflict (tenant_id, listing_id) do update set inside = excluded.inside, updated_at = now()
      `;
      matches.push({
        id: row.id,
        title: row.title,
        roomType: row.room_type,
        rentInr: num(row.rent_inr) ?? 0,
        furnishing: row.furnishing,
        description: row.description,
        lat: listingLat,
        lng: listingLng,
        distanceKm: km,
        unlockKm,
        inRange,
        isMine: row.owner_id === context.userId,
        address: inRange ? row.address : null,
        contactName: inRange ? row.contact_name : null,
        contactPhone: inRange ? row.contact_phone : null,
      });
    }

    matches.sort((a, b) => a.distanceKm - b.distanceKm);
    await sql`
      update profiles set last_lat = ${lat}, last_lng = ${lng}, last_seen_at = now()
      where user_id = ${context.userId}
    `;
    return { ok: true as const, matches, entered, radiusKm: profile.radiusKm };
  });

export const listAlerts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      listing_id: string;
      distance_m: number;
      contact_name: string;
      contact_phone: string;
      listing_title: string;
      rent_inr: number;
      address: string;
      created_at: string;
    }>`
      select id, listing_id, distance_m, contact_name, contact_phone, listing_title, rent_inr, address,
             created_at::text as created_at
      from geofence_events
      where tenant_id = ${context.userId}
      order by id desc
      limit 50
    `;
    return rows.map((r) => ({
      id: Number(r.id),
      listingId: r.listing_id,
      distanceM: Number(r.distance_m),
      contactName: r.contact_name,
      contactPhone: r.contact_phone,
      title: r.listing_title,
      rentInr: Number(r.rent_inr),
      address: r.address,
      createdAt: r.created_at,
    }));
  });

async function assertAdmin(sql: Sql, userId: string) {
  const rows = await sql<{ role: string }>`select role from profiles where user_id = ${userId}`;
  return rows[0]?.role === "admin";
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    if (!(await assertAdmin(sql, context.userId))) {
      return { ok: false as const, error: "forbidden" };
    }
    const roles = await sql<{ role: string; n: number }>`select role, count(*) as n from profiles group by role`;
    const listings = await sql<{ n: number }>`select count(*) as n from listings`;
    const live = await sql<{ n: number }>`select count(*) as n from listings where available = true`;
    const triggers = await sql<{ n: number }>`select count(*) as n from geofence_events`;
    const day = await sql<{ n: number }>`
      select count(*) as n from geofence_events where created_at > now() - interval '1 day'
    `;
    const kinds = await sql<{ kind: string; n: number }>`
      select kind, count(*) as n from activity group by kind order by n desc
    `;
    const users = await sql<{
      user_id: string;
      display_name: string;
      phone: string;
      role: string;
      address: string;
      radius_km: number;
      last_seen_at: string | null;
    }>`
      select user_id, display_name, phone, role, address, radius_km, last_seen_at::text as last_seen_at
      from profiles order by created_at desc limit 80
    `;
    const rooms = await sql<{
      id: string;
      title: string;
      rent_inr: number;
      available: boolean;
      address: string;
      room_type: string;
      display_name: string | null;
    }>`
      select l.id, l.title, l.rent_inr, l.available, l.address, l.room_type, p.display_name
      from listings l
      left join profiles p on p.user_id = l.owner_id
      order by l.created_at desc
      limit 40
    `;
    const feed = await sql<{ id: number; kind: string; detail: string; created_at: string }>`
      select id, kind, detail, created_at::text as created_at from activity order by id desc limit 40
    `;
    const countOf = (role: string) => Number(roles.find((r) => r.role === role)?.n ?? 0);
    return {
      ok: true as const,
      stats: {
        tenants: countOf("tenant"),
        landlords: countOf("landlord"),
        admins: countOf("admin"),
        listings: Number(listings[0]?.n ?? 0),
        live: Number(live[0]?.n ?? 0),
        triggers: Number(triggers[0]?.n ?? 0),
        triggersToday: Number(day[0]?.n ?? 0),
      },
      kinds: kinds.map((k) => ({ kind: k.kind, n: Number(k.n) })),
      users: users.map((u) => ({
        userId: u.user_id,
        displayName: u.display_name,
        phone: u.phone,
        role: u.role,
        address: u.address,
        radiusKm: Number(u.radius_km),
        lastSeenAt: u.last_seen_at,
      })),
      rooms: rooms.map((r) => ({
        id: r.id,
        title: r.title,
        rentInr: Number(r.rent_inr),
        available: asBool(r.available),
        address: r.address,
        roomType: r.room_type,
        ownerName: r.display_name,
      })),
      feed: feed.map((f) => ({
        id: Number(f.id),
        kind: f.kind,
        detail: f.detail,
        createdAt: f.created_at,
      })),
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .validator((data: { userId: string; role: "tenant" | "landlord" | "admin" }) => data)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const role = data.role;
    if (role !== "tenant" && role !== "landlord" && role !== "admin") {
      return { ok: false as const, error: "रोल अमान्य है।" };
    }
    if (!data.userId || data.userId.length > 80) return { ok: false as const, error: "यूज़र नहीं मिला।" };
    const sql = await getSql();
    if (!(await assertAdmin(sql, context.userId))) {
      return { ok: false as const, error: "सिर्फ़ एडमिन रोल बदल सकता है।" };
    }
    const rows = await sql<{ user_id: string }>`
      update profiles set role = ${role}, updated_at = now()
      where user_id = ${data.userId}
      returning user_id
    `;
    if (!rows.length) return { ok: false as const, error: "यूज़र नहीं मिला।" };
    await logActivity(sql, context.userId, "role_changed", `रोल बदला → ${role}`);
    return { ok: true as const };
  });
