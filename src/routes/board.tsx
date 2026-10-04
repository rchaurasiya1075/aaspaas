import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LocateFixed, Lock, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useAas } from "@/components/app-shell";
import { RangeMap } from "@/components/range-map";
import { scanRange, type EnteredAlert, type Match } from "@/lib/aaspaas.functions";
import { formatInr, formatKm, formatPhone, furnishingLabel, roomLabel } from "@/lib/copy";
import { JAIPUR, SPOTS } from "@/lib/geo";

export const Route = createFileRoute("/board")({ component: BoardPage });

function BoardPage() {
  return (
    <AppShell>
      <Board />
    </AppShell>
  );
}

function Board() {
  const { profile } = useAas();
  const [lat, setLat] = useState(profile?.lat ?? JAIPUR.lat);
  const [lng, setLng] = useState(profile?.lng ?? JAIPUR.lng);
  const [matches, setMatches] = useState<Match[]>([]);
  const [fresh, setFresh] = useState<EnteredAlert[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    if (profile?.lat != null && profile.lng != null) {
      setLat(profile.lat);
      setLng(profile.lng);
    }
  }, [profile?.lat, profile?.lng]);

  useEffect(() => {
    if (profile?.lat == null || profile.lng == null) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void scanRange({ data: { lat, lng } })
        .then((res) => {
          if (cancelled) return;
          if (!res.ok) {
            setStatus(res.error === "needs-profile" ? null : res.error);
            return;
          }
          setStatus(null);
          setMatches(res.matches);
          if (res.entered.length) {
            setFresh(res.entered);
            for (const item of res.entered) {
              const body = `${item.contactName} · ${formatPhone(item.contactPhone)}`;
              toast(`${item.title} रेंज में है`, { description: body });
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification(`AasPaas · ${item.title}`, { body });
              }
            }
          }
        })
        .catch(() => {
          if (!cancelled) setStatus("रेंज जाँची नहीं जा सकी।");
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [lat, lng, profile]);

  useEffect(() => {
    if (!tracking) return;
    if (!navigator.geolocation) {
      setStatus("इस ब्राउज़र में लोकेशन नहीं है। पिन खींचें।");
      setTracking(false);
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => {
        setStatus("लाइव लोकेशन नहीं मिली। पिन खींचें या इलाका चुनें।");
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [tracking]);

  const pins = useMemo(
    () => matches.map((m) => ({ id: m.id, lat: m.lat, lng: m.lng, title: m.title, inRange: m.inRange })),
    [matches],
  );
  const inside = matches.filter((m) => m.inRange);

  if (!profile || profile.lat === null || profile.lng === null) {
    return (
      <section className="rounded-card border border-line bg-card p-5">
        <h1 className="font-display text-3xl">पहले अपनी जगह बताएँ।</h1>
        <p className="mt-2 text-muted">पता, मोबाइल और रेंज सेव किए बिना घेरा नहीं बनता।</p>
        <Link
          to="/profile"
          className="mt-5 inline-flex h-12 items-center rounded-full bg-ink px-5 font-medium text-paper"
        >
          प्रोफ़ाइल खोलें
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">आपका घेरा</h1>
          <p className="text-sm text-muted">काली पिन खींचें। हरा बिंदु रेंज के अंदर का कमरा है।</p>
        </div>
        <p className="text-right text-sm tabular-nums">
          <span className="block font-display text-2xl text-olive">{inside.length}</span>
          अंदर
        </p>
      </div>

      <div className="h-map overflow-hidden rounded-card border border-line">
        <RangeMap
          lat={lat}
          lng={lng}
          radiusKm={profile.radiusKm}
          pins={pins}
          onMove={(nextLat, nextLng) => {
            setTracking(false);
            setLat(nextLat);
            setLng(nextLng);
          }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setTracking((v) => !v)}
          className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm ${tracking ? "bg-olive text-paper" : "bg-card border border-line"}`}
        >
          <LocateFixed className="size-4" />
          {tracking ? "लाइव चल रहा है" : "लाइव लोकेशन"}
        </button>
        <button
          type="button"
          className="inline-flex h-11 shrink-0 items-center rounded-full border border-line bg-card px-4 text-sm"
          onClick={() => {
            if (typeof Notification === "undefined") return;
            void Notification.requestPermission();
          }}
        >
          सूचना चालू करें
        </button>
        {SPOTS.map((spot) => (
          <button
            key={spot.id}
            type="button"
            className="h-11 shrink-0 rounded-full border border-line bg-card px-4 text-sm"
            onClick={() => {
              setTracking(false);
              setLat(spot.lat);
              setLng(spot.lng);
            }}
          >
            {spot.name}
          </button>
        ))}
      </div>

      {status ? <p className="text-sm text-saffron">{status}</p> : null}

      {fresh.length ? (
        <div className="rounded-card border border-olive bg-olive-soft p-4">
          <p className="text-sm font-medium text-olive">अभी अनलॉक हुआ</p>
          <ul className="mt-2 space-y-2">
            {fresh.map((item) => (
              <li key={item.id} className="text-sm">
                <span className="font-medium">{item.title}</span>
                {" · "}
                {item.contactName} · {formatPhone(item.contactPhone)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {matches.length === 0 ? (
        <section className="rounded-card border border-dashed border-line bg-card p-5">
          <h2 className="font-display text-2xl">घेरे में अभी कोई कमरा नहीं।</h2>
          <p className="mt-2 text-sm text-muted">
            अपना कमरा जोड़ें, फिर पिन को उसके पास ले जाएँ। रेंज में आते ही संपर्क अलर्ट में चला जाएगा —
            अपना ही कमरा टेस्ट के लिए काफ़ी है।
          </p>
          <Link to="/listings" className="mt-4 inline-flex h-11 items-center rounded-full bg-ink px-4 text-sm text-paper">
            कमरा जोड़ें
          </Link>
        </section>
      ) : (
        <ul className="space-y-3">
          {matches.slice(0, 20).map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RoomCard({ room }: { room: Match }) {
  return (
    <li className={`rounded-card border p-4 ${room.inRange ? "border-olive bg-olive-soft" : "border-line bg-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">
            {roomLabel(room.roomType)}
            {room.isMine ? " · आपका कमरा" : ""}
          </p>
          <h2 className="font-display text-2xl">{room.title}</h2>
        </div>
        <p className="shrink-0 font-medium tabular-nums">{formatInr(room.rentInr)}</p>
      </div>
      <p className="mt-1 text-sm text-muted">
        {furnishingLabel(room.furnishing)} · {formatKm(room.distanceKm)} · सीमा {room.unlockKm} किमी
      </p>
      {room.description ? <p className="mt-2 text-sm">{room.description}</p> : null}
      {room.inRange && room.contactPhone && room.contactName ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm">
            {room.contactName}
            {room.address ? ` · ${room.address}` : ""}
          </p>
          <div className="flex gap-2">
            <a
              href={`tel:+91${room.contactPhone}`}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm text-paper"
            >
              <Phone className="size-4" />
              {formatPhone(room.contactPhone)}
            </a>
            <a
              href={`https://wa.me/91${room.contactPhone}`}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm"
            >
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted">
          <Lock className="size-4" />
          नंबर और पता घेरे के अंदर खुलेंगे
        </p>
      )}
    </li>
  );
}
