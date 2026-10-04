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

function gmailMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (/pop-?up/i.test(msg)) {
    return "पॉप-अप ब्लॉक है। अनुमति दें, फिर Gmail बटन फिर दबाएँ।";
  }
  if (/cancel/i.test(msg)) return "Gmail साइन-इन रद्द हो गया।";
  return "Gmail से अंदर नहीं आ सके। एक बार और कोशिश करें।";
}

function Login() {
  const { user, isPending } = useCurrentUserState();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorOn, setErrorOn] = useState<"gmail" | "form">("form");
  const [busy, setBusy] = useState(false);
  const [gmailBusy, setGmailBusy] = useState(false);

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

  async function onGmail() {
    setError(null);
    setGmailBusy(true);
    try {
      await signIn("grok-google", { callbackURL: "/profile" });
    } catch (err) {
      setErrorOn("gmail");
      setError(gmailMessage(err));
      setGmailBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || password.length < 8) {
      setErrorOn("form");
      setError("ईमेल सही हो और पासवर्ड कम से कम 8 अक्षर का।");
      return;
    }
    if (mode === "up" && name.trim().length < 2) {
      setErrorOn("form");
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
      setErrorOn("form");
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

  const otherProviders = GROK_PROVIDERS.filter((p) => p.idp !== "google");

  return (
    <main className="min-h-screen bg-paper px-4 py-10 text-ink">
      <div className="mx-auto w-full max-w-sm">
        <Link to="/" className="font-display text-2xl">
          AasPaas
        </Link>
        <h1 className="mt-6 font-display text-4xl">Gmail से अंदर आइए।</h1>
        <p className="mt-2 text-sm text-muted">
          पहली बार यही बटन अकाउंट बना देता है। अगली बार वही Gmail साइन इन कर देता है। फिर प्रोफ़ाइल में
          मोबाइल और लोकेशन डालेंगे। नंबर सिर्फ़ रेंज के अंदर दिखेगा।
        </p>

        {authEnabled ? (
          <>
            <button
              type="button"
              disabled={gmailBusy}
              onClick={() => void onGmail()}
              className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-ink font-medium text-paper disabled:opacity-60"
            >
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-full bg-paper text-sm font-semibold text-ink"
              >
                G
              </span>
              {gmailBusy ? "Gmail खुल रहा है…" : "Gmail से साइन इन / साइन अप"}
            </button>
            {error && errorOn === "gmail" ? <p className="mt-3 text-sm text-saffron">{error}</p> : null}

            <div className="my-6 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              या ईमेल से
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
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
              {error && errorOn === "form" ? <p className="text-sm text-saffron">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-full border border-line bg-card font-medium disabled:opacity-60"
              >
                {busy ? "रुकिए…" : mode === "up" ? "ईमेल से अकाउंट बनाएँ" : "ईमेल से साइन इन"}
              </button>
              <button
                type="button"
                className="h-11 w-full text-sm text-muted"
                onClick={() => {
                  setMode(mode === "up" ? "in" : "up");
                  setError(null);
                }}
              >
                {mode === "up" ? "पहले से ईमेल अकाउंट है? साइन इन" : "नया ईमेल अकाउंट बनाएँ"}
              </button>
            </form>

            {otherProviders.length > 0 ? (
              <div className="mt-4 space-y-2">
                {otherProviders.map((p) => (
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
            ) : null}
          </>
        ) : (
          <p className="mt-6 text-sm text-muted">साइन-इन अभी बंद है।</p>
        )}
      </div>
    </main>
  );
}
