import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Phone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { listAlerts, type AlertRow } from "@/lib/aaspaas.functions";
import { formatInr, formatPhone, formatWhen } from "@/lib/copy";

export const Route = createFileRoute("/alerts")({ component: AlertsPage });

function AlertsPage() {
  return (
    <AppShell>
      <Alerts />
    </AppShell>
  );
}

function Alerts() {
  const [rows, setRows] = useState<AlertRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listAlerts()
      .then(setRows)
      .catch(() => setError("अलर्ट नहीं खुले।"));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl">अलर्ट</h1>
        <p className="mt-1 text-sm text-muted">
          जब आप किसी कमरे के घेरे में कदम रखते हैं, संपर्क यहीं सेव हो जाता है। बाहर निकलने पर नया अलर्ट नहीं बनता।
        </p>
      </div>
      {error ? <p className="text-sm text-saffron">{error}</p> : null}
      {rows === null ? <div className="h-24 animate-pulse rounded-card bg-paper-deep" /> : null}
      {rows && rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-line bg-card p-5 text-sm text-muted">
          अभी कोई ट्रिगर नहीं। रेंज पेज पर पिन को किसी कमरे के पास ले जाएँ।
        </p>
      ) : null}
      <ul className="space-y-3">
        {rows?.map((row) => (
          <li key={row.id} className="rounded-card border border-line bg-card p-4">
            <p className="text-xs text-muted">{formatWhen(row.createdAt)} · {row.distanceM} मी</p>
            <h2 className="font-display text-2xl">{row.title}</h2>
            <p className="text-sm">
              {row.contactName} · {formatInr(row.rentInr)}
            </p>
            <p className="mt-1 text-sm text-muted">{row.address}</p>
            <div className="mt-3 flex gap-2">
              <a
                href={`tel:+91${row.contactPhone}`}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm text-paper"
              >
                <Phone className="size-4" />
                {formatPhone(row.contactPhone)}
              </a>
              <a
                href={`https://wa.me/91${row.contactPhone}`}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm"
              >
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
