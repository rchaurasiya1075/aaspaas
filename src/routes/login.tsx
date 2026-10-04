import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

type EmailAuth = {
  signUp: {
    email: (body: {
      email: string;
      password: string;
      name: string;
    }) => Promise<{ error: { message?: string } | null }>;
  };
  signIn: {
    email: (body: {
      email: string;
      password: string;
    }) => Promise<{ error: { message?: string } | null }>;
  };
};

function Login() {
  const { user, isPending } = useCurrentUserState();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper">
        <div className="h-8 w-32 animate-pulse rounded-full bg-paper-deep" />
      </main>
    );
  }
  if (user) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-6 text-center text-ink">
        <div>
          <p className="font-display text-3xl">आप अंदर हैं।</p>
          <Link to="/board" className="mt-4 inline-flex h-12 items-center rounded-full bg-ink px-6 text-paper">
            रेंज खोलें
          </Link>
        </div>
      </main>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || password.length < 8) {
      setError("ईमेल सही हो और पासवर्ड कम से कम 8 अक्षर का।");
      return;
    }
    if (mode === "up" && name.trim().length < 2) {
      setError("अपना नाम लिखें।");
      return;
    }
    setBusy(true);
    const client = authClient as unknown as EmailAuth;
    const result =
      mode === "up"
        ? await client.signUp.email({ email: email.trim(), password, name: name.trim() })
        : await client.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      const msg = result.error.message ?? "";
      setError(
        /exist/i.test(msg)
          ? "यह ईमेल पहले से है। साइन इन करें।"
          : /invalid|password|credential/i.test(msg)
            ? "ईमेल या पासवर्ड नहीं मिला।"
            : "अकाउंट नहीं खुला। फिर कोशिश करें।",
      );
      return;
    }
    await router.invalidate();
    await router.navigate({ to: "/profile" });
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-10 text-ink">
      <div className="mx-auto w-full max-w-sm">
        <Link to="/" className="font-display text-2xl">
          AasPaas
        </Link>
        <h1 className="mt-6 font-display text-4xl">अंदर आइए।</h1>
        <p className="mt-2 text-sm text-muted">
          फिर प्रोफ़ाइल में मोबाइल नंबर और लोकेशन डालेंगे। नंबर सिर्फ़ रेंज के अंदर दिखेगा।
        </p>

        {authEnabled ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            {mode === "up" ? (
              <label className="block text-sm">
                नाम
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="mt-1 h-12 w-full rounded-2xl border border-line bg-card px-4 text-ink"
                />
              </label>
            ) : null}
            <label className="block text-sm">
              ईमेल
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="mt-1 h-12 w-full rounded-2xl border border-line bg-card px-4 text-ink"
              />
            </label>
            <label className="block text-sm">
              पासवर्ड
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                className="mt-1 h-12 w-full rounded-2xl border border-line bg-card px-4 text-ink"
              />
            </label>
            {error ? <p className="text-sm text-saffron">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-full bg-ink font-medium text-paper disabled:opacity-60"
            >
              {busy ? "रुकिए…" : mode === "up" ? "अकाउंट बनाएँ" : "साइन इन"}
            </button>
            <button
              type="button"
              className="h-11 w-full text-sm text-muted"
              onClick={() => {
                setMode(mode === "up" ? "in" : "up");
                setError(null);
              }}
            >
              {mode === "up" ? "पहले से अकाउंट है? साइन इन" : "नया अकाउंट बनाएँ"}
            </button>
          </form>
        ) : (
          <p className="mt-6 text-sm text-muted">साइन-इन अभी बंद है।</p>
        )}

        <div className="my-6 h-px bg-line" />
        <div className="space-y-2">
          {GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => void signIn(p.providerId, { callbackURL: "/profile" })}
              className="h-12 w-full rounded-full border border-line bg-card font-medium"
            >
              {p.label} से जारी रखें
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
