"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { NOTIFICATION_TOPICS, type NotificationPrefs } from "@/lib/notification-prefs";

/** Co mi má chodit: zaškrtnuté druhy dostávám do zvonečku i jako push. */
export function NotificationPrefsForm({ prefs: initial, digestEmail: initialDigest, email }: { prefs: NotificationPrefs; digestEmail: boolean; email?: string }) {
  const [prefs, setPrefs] = useState(initial);
  const [digestEmail, setDigestEmail] = useState(initialDigest);
  const [busy, setBusy] = useState<string | null>(null);

  async function save(key: string, body: object, apply: () => void, revert: () => void) {
    setBusy(key);
    apply();
    try {
      const res = await fetch("/api/me/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
    } catch {
      revert();
      toast.error("Nepodařilo se uložit");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="divide-y">
      {NOTIFICATION_TOPICS.map((t) => {
        const on = prefs[t.key] !== false;
        return (
          <li key={t.key} className="py-3 first:pt-0 last:pb-0">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                className="mt-0.5"
                checked={on}
                disabled={busy === t.key}
                onCheckedChange={(v) =>
                  save(
                    t.key,
                    { topic: t.key, enabled: !!v },
                    () => setPrefs((p) => ({ ...p, [t.key]: !!v })),
                    () => setPrefs((p) => ({ ...p, [t.key]: on }))
                  )
                }
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.description}</span>
              </span>
            </label>
            {t.key === "calendar" && (
              <label className="mt-2 ml-7 flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={digestEmail}
                  disabled={busy === "digestEmail"}
                  onCheckedChange={(v) =>
                    save(
                      "digestEmail",
                      { digestEmail: !!v },
                      () => setDigestEmail(!!v),
                      () => setDigestEmail(digestEmail)
                    )
                  }
                />
                <span>
                  Souhrn i e-mailem{email && <span className="text-muted-foreground"> na {email}</span>}
                </span>
              </label>
            )}
          </li>
        );
      })}
    </ul>
  );
}
