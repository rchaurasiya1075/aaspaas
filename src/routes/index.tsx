import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, MapPin, Radio } from "lucide-react";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { JAIPUR } from "@/lib/geo";
import { RangeMap } from "@/components/range-map";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <span className="font-display text-2xl">AasPaas</span>
        <span className="text-sm text-muted">जयपुर से शुरू</span>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <p className="text-sm font-medium tracking-wide text-olive">किरायेदार × मकान मालिक</p>
        <h1 className="mt-2 max-w-xl font-display text-5xl leading-tight">
          घेरे में कदम रखते ही कमरा और नंबर।
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          दोनों अपनी लोकेशन और 1 से 10 किलोमीटर की रेंज रखते हैं। आप घेरे के अंदर आते ही उपलब्ध कमरे और
          मकान मालिक का संपर्क अलर्ट में खुलता है। बाहर नंबर छिपा रहता है।
        </p>
        <div className="mt-6 max-w-sm">
          <Cta />
        </div>

        <div className="relative mt-10 h-map overflow-hidden rounded-card border border-line">
          <RangeMap lat={JAIPUR.lat} lng={JAIPUR.lng} radiusKm={3} pins={[]} />
          <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-card px-3 py-1 text-xs text-ink">
            जयपुर · उदाहरण घेरा, 3 किमी
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-3">
          <Step
            icon={MapPin}
            title="प्रोफ़ाइल"
            body="पता लिखें। लोकेशन ऑटो डिटेक्ट होती है, या पिन खींचें।"
          />
          <Step icon={Radio} title="रेंज" body="स्लाइडर से 1 से 10 किलोमीटर का घेरा सेट करें।" />
          <Step
            icon={Lock}
            title="जियोफेंस"
            body="रेंज में आते ही कमरे और संपर्क ऐप अलर्ट में चले जाते हैं।"
          />
        </ol>

        <p className="mt-10 max-w-xl text-sm text-muted">
          लॉगिन Gmail से होता है — पहली बार अकाउंट बनता है, आगे साइन इन। ईमेल भी चलता है। मोबाइल नंबर
          प्रोफ़ाइल पर रहता है और सिर्फ़ रेंज के अंदर सामने वाले को मिलता है।
        </p>
      </main>
    </div>
  );
}

function Cta() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="h-12 animate-pulse rounded-full bg-paper-deep" />;
  if (user) {
    return (
      <SignedIn>
        <Link
          to="/board"
          className="flex h-12 items-center justify-center rounded-full bg-ink px-6 font-medium text-paper"
        >
          अपनी रेंज खोलें
        </Link>
      </SignedIn>
    );
  }
  return (
    <SignedOut>
      <Link
        to="/login"
        className="flex h-12 items-center justify-center rounded-full bg-ink px-6 font-medium text-paper"
      >
        शुरू करें
      </Link>
    </SignedOut>
  );
}

function Step({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof MapPin;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-card border border-line bg-card p-4">
      <Icon className="size-5 text-saffron" strokeWidth={1.75} />
      <h2 className="mt-3 font-display text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </li>
  );
}
