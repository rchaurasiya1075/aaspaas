import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Home, LayoutDashboard, Radar, UserRound } from "lucide-react";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe, type Profile } from "@/lib/aaspaas.functions";

type AasState = {
  profile: Profile | null;
  adminExists: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AasContext = createContext<AasState | null>(null);

export function useAas(): AasState {
  const ctx = useContext(AasContext);
  if (!ctx) throw new Error("useAas outside shell");
  return ctx;
}

const LINKS = [
  { to: "/board", label: "रेंज", icon: Radar },
  { to: "/alerts", label: "अलर्ट", icon: Bell },
  { to: "/listings", label: "कमरे", icon: Home },
  { to: "/profile", label: "प्रोफ़ाइल", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [adminExists, setAdminExists] = useState(false);
  const [loading, setLoading] = useState(true);

  const userId = user?.id;

  const refresh = useCallback(async () => {
    const data = await getMe();
    setProfile(data.profile);
    setAdminExists(data.adminExists);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let gone = false;
    void getMe()
      .then((data) => {
        if (gone) return;
        setProfile(data.profile);
        setAdminExists(data.adminExists);
        setLoading(false);
      })
      .catch(() => {
        if (!gone) setLoading(false);
      });
    return () => {
      gone = true;
    };
  }, [userId]);

  if (isPending || (user && loading)) {
    return (
      <div className="min-h-screen bg-paper px-4 pt-6 text-ink">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-8 w-36 animate-pulse rounded-full bg-paper-deep" />
          <div className="h-map animate-pulse rounded-card bg-paper-deep" />
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const links =
    profile?.role === "admin"
      ? [...LINKS, { to: "/admin" as const, label: "एडमिन", icon: LayoutDashboard }]
      : [...LINKS];

  return (
    <AasContext.Provider value={{ profile, adminExists, loading: false, refresh }}>
      <div className="min-h-screen bg-paper text-ink">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <Link to="/board" className="font-display text-2xl leading-none">
              AasPaas
            </Link>
            <div className="flex items-center gap-3">
              {profile ? (
                <span className="rounded-full bg-paper-deep px-3 py-1 text-sm tabular-nums text-ink">
                  {profile.radiusKm} किमी
                </span>
              ) : null}
              <UserButton />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">{children}</main>
        <nav className="dock fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card">
          <ul className="mx-auto flex max-w-3xl">
            {links.map((item) => {
              const active = path === item.to;
              const Icon = item.icon;
              return (
                <li key={item.to} className="flex-1">
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-14 flex-col items-center justify-center gap-0.5 text-xs ${active ? "text-ink" : "text-muted"}`}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </AasContext.Provider>
  );
}
