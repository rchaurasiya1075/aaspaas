import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { adminOverview, setUserRole } from "@/lib/aaspaas.functions";
import { formatInr, formatPhone, formatWhen, roomLabel } from "@/lib/copy";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  return (
    <AppShell>
      <Admin />
    </AppShell>
  );
}

const KIND: Record<string, string> = {
  profile_saved: "प्रोफ़ाइल",
  listing_saved: "कमरा",
  listing_removed: "हटाया",
  geofence_enter: "एंटर",
  geofence_exit: "बाहर",
  admin_claimed: "एडमिन",
  role_changed: "रोल",
};

type Overview = Extract<Awaited<ReturnType<typeof adminOverview>>, { ok: true }>;

function Admin() {
  const [data, setData] = useState<Overview | null>(null);
  const [denied, setDenied] = useState(false);

  function load() {
    void adminOverview()
      .then((res) => {
        if (!res.ok) {
          setDenied(true);
          return;
        }
        setDenied(false);
        setData(res);
      })
      .catch(() => setDenied(true));
  }

  useEffect(() => {
    load();
  }, []);

  if (denied) {
    return (
      <section className="rounded-card border border-line bg-card p-5">
        <h1 className="font-display text-3xl">एडमिन बंद है।</h1>
        <p className="mt-2 text-sm text-muted">
          अगर अभी कोई ऑपरेटर नहीं है, प्रोफ़ाइल से एडमिन क्लेम करें।
        </p>
        <Link to="/profile" className="mt-4 inline-flex h-12 items-center rounded-full bg-ink px-5 text-paper">
          प्रोफ़ाइल
        </Link>
      </section>
    );
  }

  if (!data) return <div className="h-map animate-pulse rounded-card bg-paper-deep" />;

  const { stats } = data;
  const cards = [
    ["किरायेदार", stats.tenants],
    ["मकान मालिक", stats.landlords],
    ["लाइव कमरे", stats.live],
    ["आज के ट्रिगर", stats.triggersToday],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">एडमिन</h1>
        <p className="mt-1 text-sm text-muted">
          सारे अकाउंट, कमरे और जियोफेंस ट्रिगर। कुल ट्रिगर {stats.triggers}।
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {cards.map(([label, n]) => (
          <li key={label} className="rounded-card border border-line bg-card p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="font-display text-4xl tabular-nums">{n}</p>
          </li>
        ))}
      </ul>

      {data.kinds.length ? (
        <div className="h-56 rounded-card border border-line bg-card p-3 text-ink">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.kinds.map((k) => ({ name: KIND[k.kind] ?? k.kind, n: k.n }))}>
              <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 12 }} interval={0} />
              <YAxis allowDecimals={false} width={28} tick={{ fill: "currentColor", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="n" fill="var(--color-saffron)" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-2xl">लोग</h2>
        {data.users.map((user) => (
          <article key={user.userId} className="rounded-card border border-line bg-card p-4">
            <p className="font-medium">{user.displayName}</p>
            <p className="text-sm text-muted">
              {formatPhone(user.phone)} · {user.role} · {user.radiusKm} किमी
            </p>
            <p className="text-sm">{user.address}</p>
            {user.lastSeenAt ? (
              <p className="text-xs text-muted">आखिरी पिन {formatWhen(user.lastSeenAt)}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {(["tenant", "landlord", "admin"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  disabled={user.role === role}
                  className="h-10 rounded-full border border-line px-3 text-xs disabled:opacity-40"
                  onClick={() => {
                    void setUserRole({ data: { userId: user.userId, role } }).then(load);
                  }}
                >
                  {role === "tenant" ? "किरायेदार" : role === "landlord" ? "मालिक" : "एडमिन"}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">कमरे</h2>
        {data.rooms.length === 0 ? <p className="text-sm text-muted">कोई कमरा नहीं।</p> : null}
        {data.rooms.map((room) => (
          <article key={room.id} className="rounded-card border border-line bg-card p-4 text-sm">
            <p className="font-medium">{room.title}</p>
            <p className="text-muted">
              {room.ownerName ?? "—"} · {roomLabel(room.roomType)} · {formatInr(room.rentInr)} ·{" "}
              {room.available ? "खुला" : "बंद"}
            </p>
            <p>{room.address}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">गतिविधि</h2>
        <ul className="space-y-2">
          {data.feed.map((item) => (
            <li key={item.id} className="border-b border-line pb-2 text-sm">
              <span className="text-muted">{formatWhen(item.createdAt)} · </span>
              {item.detail}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
