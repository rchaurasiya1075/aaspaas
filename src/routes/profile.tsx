import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useAas } from "@/components/app-shell";
import { RadiusSlider } from "@/components/radius-slider";
import { RangeMap } from "@/components/range-map";
import { claimAdmin, saveProfile, stepDownAdmin } from "@/lib/aaspaas.functions";
import { SEEKER_TYPES } from "@/lib/copy";
import type { SeekerTypeId } from "@/lib/copy";
import { JAIPUR, SPOTS } from "@/lib/geo";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  return (
    <AppShell>
      <ProfileForm />
    </AppShell>
  );
}

function ProfileForm() {
  const { profile, adminExists, refresh } = useAas();
  const router = useRouter();
  const [picked, setPicked] = useState(Boolean(profile));
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [role, setRole] = useState<"tenant" | "landlord">(profile?.role === "landlord" ? "landlord" : "tenant");
  const [seekerType, setSeekerType] = useState<SeekerTypeId | "">(profile?.seekerType || "student");
  const [budgetMin, setBudgetMin] = useState(profile?.budgetMin ? String(profile.budgetMin) : "");
  const [budgetMax, setBudgetMax] = useState(profile?.budgetMax ? String(profile.budgetMax) : "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [lat, setLat] = useState(profile?.lat ?? JAIPUR.lat);
  const [lng, setLng] = useState(profile?.lng ?? JAIPUR.lng);
  const [radiusKm, setRadiusKm] = useState(profile?.radiusKm ?? 3);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locNote, setLocNote] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setPhone(profile.phone);
    setRole(profile.role === "landlord" ? "landlord" : "tenant");
    setSeekerType(profile.seekerType || "student");
    setBudgetMin(profile.budgetMin ? String(profile.budgetMin) : "");
    setBudgetMax(profile.budgetMax ? String(profile.budgetMax) : "");
    setAddress(profile.address);
    if (profile.lat != null && profile.lng != null) {
      setLat(profile.lat);
      setLng(profile.lng);
    }
    setRadiusKm(profile.radiusKm);
  }, [profile]);

  function detect() {
    setLocNote(null);
    if (!navigator.geolocation) {
      setLocNote("लोकेशन सपोर्ट नहीं है। पिन खींचें।");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        setLat(nextLat);
        setLng(nextLng);
        setLocNote("लोकेशन मिल गई। पता खाली हो तो अपने आप भरा जाएगा।");
        if (!address.trim()) {
          void fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nextLat}&lon=${nextLng}`,
          )
            .then((r) => r.json())
            .then((data: { display_name?: string }) => {
              if (data.display_name) setAddress(data.display_name.slice(0, 180));
            })
            .catch(() => undefined);
        }
      },
      () => setLocNote("लोकेशन नहीं मिली। पिन खींचें या इलाका चुनें।"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveProfile({
      data: {
        displayName,
        phone,
        role,
        address,
        lat,
        lng,
        radiusKm,
        seekerType: role === "tenant" ? seekerType || "student" : "",
        budgetMin: Number(budgetMin) || 0,
        budgetMax: Number(budgetMax) || 0,
      },
    }).catch(() => ({ ok: false as const, error: "सेव नहीं हो सका।" }));
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await refresh();
    toast("प्रोफ़ाइल सेव हो गई");
    await router.navigate({ to: role === "landlord" ? "/listings" : "/board" });
  }

  if (!profile && !picked) {
    return (
      <section className="space-y-4">
        <div>
          <h1 className="font-display text-4xl">आप कौन हैं?</h1>
          <p className="mt-2 text-sm text-muted">
            अकाउंट खुल चुका है। मोबाइल नंबर अगली स्क्रीन पर सेव होगा। SMS OTP इस ऐप में नहीं भेजा जाता — उसके
            लिए अलग से billed SMS गेटवे चाहिए।
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRole("tenant");
            setPicked(true);
          }}
          className="w-full rounded-card border border-line bg-card p-5 text-left"
        >
          <p className="font-display text-3xl">मैं कमरा ढूँढ रहा हूँ</p>
          <p className="mt-1 text-sm text-muted">लोकेशन, 1–10 किमी रेंज और बजट। घेरे में मालिक का नंबर खुलेगा।</p>
        </button>
        <button
          type="button"
          onClick={() => {
            setRole("landlord");
            setPicked(true);
          }}
          className="w-full rounded-card border border-line bg-card p-5 text-left"
        >
          <p className="font-display text-3xl">मकान किराए पर देना है</p>
          <p className="mt-1 text-sm text-muted">पता और पिन सेट करें, फिर कमरा, किराया और खाली/भरा स्टेटस डालें।</p>
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">{role === "landlord" ? "मकान मालिक" : "किरायेदार"}</h1>
        <p className="mt-1 text-sm text-muted">
          {role === "landlord"
            ? "नाम, नंबर और मकान की जगह। कमरे की डिटेल अगली स्क्रीन पर जाएगी।"
            : "नाम, नंबर, बजट और कितने किलोमीटर तक कमरा चाहिए।"}
        </p>
      </div>

      <label className="block text-sm">
        नाम
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 h-12 w-full rounded-2xl border border-line bg-card px-4"
        />
      </label>

      <label className="block text-sm">
        मोबाइल
        <input
          inputMode="tel"
          autoComplete="tel"
          placeholder="98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 h-12 w-full rounded-2xl border border-line bg-card px-4"
        />
      </label>

      {role === "tenant" && profile?.role !== "admin" ? (
        <>
          <fieldset>
            <legend className="text-sm">प्रोफ़ाइल टाइप</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {SEEKER_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSeekerType(item.id)}
                  className={`h-12 rounded-full border text-sm ${seekerType === item.id ? "border-ink bg-ink text-paper" : "border-line bg-card"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              न्यूनतम किराया
              <input
                inputMode="numeric"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="3000"
                className="mt-1 h-12 w-full rounded-2xl border border-line bg-card px-4"
              />
            </label>
            <label className="block text-sm">
              अधिकतम किराया
              <input
                inputMode="numeric"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="12000"
                className="mt-1 h-12 w-full rounded-2xl border border-line bg-card px-4"
              />
            </label>
          </div>
        </>
      ) : null}

      {profile?.role === "admin" ? (
        <p className="rounded-card bg-olive-soft px-4 py-3 text-sm text-olive">
          आप एडमिन हैं। कमरे भी जोड़ सकते हैं।{" "}
          <Link to="/admin" className="underline">
            डैशबोर्ड
          </Link>
        </p>
      ) : (
        <fieldset>
          <legend className="text-sm">मैं हूँ</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["tenant", "किरायेदार"],
                ["landlord", "मकान मालिक"],
              ] as const
            ).map(([id, label]) => (
              <label
                key={id}
                className={`flex h-12 items-center justify-center rounded-full border ${role === id ? "border-ink bg-ink text-paper" : "border-line bg-card"}`}
              >
                <input
                  type="radio"
                  name="role"
                  className="sr-only"
                  checked={role === id}
                  onChange={() => setRole(id)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="block text-sm">
        पता
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3"
        />
      </label>

      <div className="h-map overflow-hidden rounded-card border border-line">
        <RangeMap lat={lat} lng={lng} radiusKm={radiusKm} pins={[]} onMove={(a, b) => { setLat(a); setLng(b); }} />
      </div>
      <div className="flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={detect}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-sm text-paper"
        >
          <LocateFixed className="size-4" />
          लोकेशन पकड़ो
        </button>
        {SPOTS.map((spot) => (
          <button
            key={spot.id}
            type="button"
            className="h-11 shrink-0 rounded-full border border-line bg-card px-4 text-sm"
            onClick={() => {
              setLat(spot.lat);
              setLng(spot.lng);
            }}
          >
            {spot.name}
          </button>
        ))}
      </div>
      {locNote ? <p className="text-sm text-muted">{locNote}</p> : null}

      <RadiusSlider value={radiusKm} onChange={setRadiusKm} />

      {error ? <p className="text-sm text-saffron">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="h-12 w-full rounded-full bg-ink font-medium text-paper disabled:opacity-60"
      >
        {busy ? "सेव हो रहा है…" : "प्रोफ़ाइल सेव करें"}
      </button>

      {!adminExists && profile ? (
        <button
          type="button"
          className="h-11 w-full rounded-full border border-line text-sm"
          onClick={() => {
            void claimAdmin()
              .then(async (res) => {
                if (!res.ok) {
                  toast(res.error);
                  return;
                }
                await refresh();
                toast("अब आप एडमिन हैं");
              })
              .catch(() => toast("क्लेम नहीं हो सका"));
          }}
        >
          कोई ऑपरेटर नहीं है — एडमिन बनें
        </button>
      ) : null}
      {profile?.role === "admin" ? (
        <button
          type="button"
          className="h-11 w-full text-sm text-muted"
          onClick={() => {
            void stepDownAdmin()
              .then(async () => {
                await refresh();
                toast("एडमिन रोल हट गया");
              })
              .catch(() => toast("रोल नहीं बदला"));
          }}
        >
          एडमिन छोड़ें
        </button>
      ) : null}
    </form>
  );
}
