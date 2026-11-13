"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  HUB_FEATURES,
  HUB_FEATURE_GROUPS,
  HUB_FEATURE_INFO,
  HUB_FEATURE_REQUIRES,
  hubFeatureDependents,
  type HubFeature,
  type HubFeatures,
} from "@/lib/hub-features";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Prague",
  });

/**
 * Karta SoloPixel HUB v detailu klienta (záložka Služby): stav přístupu,
 * pozvánka a funkce klientské zóny po skupinách (`clients.hubFeatures`).
 * Funkce se přidávají v lib/hub-features.ts, karta se vykreslí sama.
 */
export function HubSection({
  clientId,
  features,
  invitedAt,
  lastSignInAt,
  inviteHref,
}: {
  clientId: string;
  features: HubFeatures;
  invitedAt: string | null;
  lastSignInAt: string | null;
  /** Odkaz na pozvánku (bez e-mailu nebo u archivovaného klienta chybí). */
  inviteHref?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(features);
  const [saving, setSaving] = useState<HubFeature | null>(null);
  const activeCount = (Object.keys(state) as HubFeature[]).filter((f) => state[f]).length;

  async function toggle(feature: HubFeature) {
    const enabled = !state[feature];
    const required = HUB_FEATURE_REQUIRES[feature];
    if (enabled && required && !state[required]) {
      toast.warning(`Nejdřív zapněte ${HUB_FEATURES[required]}, ${HUB_FEATURES[feature]} na ně navazují.`);
      return;
    }
    const before = state;
    // Vypnutí zhasne i funkce, které na této stojí (stejně jako na serveru).
    const alsoOff = enabled ? [] : hubFeatureDependents(feature).filter((f) => state[f]);
    setSaving(feature);
    setState((s) => ({ ...s, [feature]: enabled, ...Object.fromEntries(alsoOff.map((f) => [f, false])) }));
    try {
      const res = await fetch(`/api/clients/${clientId}/hub-features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, enabled }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Nepodařilo se uložit");
      const changed = [feature, ...alsoOff].map((f) => HUB_FEATURES[f]).join(" a ");
      toast.success(`${changed} v SoloPixel HUB ${enabled ? "zapnuto" : "vypnuto"}`);
      router.refresh();
    } catch (err) {
      setState(before);
      toast.error(err instanceof Error ? err.message : "Nepodařilo se uložit");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">SoloPixel HUB</h3>
          <p className="text-sm text-muted-foreground">
            {invitedAt ? `Pozvánka ${new Date(invitedAt).toLocaleDateString("cs-CZ")}` : "Zatím bez pozvánky"}
            {invitedAt && (lastSignInAt ? ` · naposledy přihlášen ${dateTime(lastSignInAt)}` : " · zatím se nepřihlásil")}
            {` · zapnuto ${activeCount} z ${Object.keys(HUB_FEATURES).length}`}
          </p>
        </div>
        {inviteHref && (
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={inviteHref} />}>
            <UserPlus className="mr-2 h-4 w-4" />
            {invitedAt ? "Poslat pozvánku znovu" : "Pozvat do HUB"}
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {HUB_FEATURE_GROUPS.map((group) => (
          <div key={group.label} className="rounded-xl border">
            <p className="border-b px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <ul className="divide-y">
              {group.features.map((feature) => {
                const on = state[feature];
                const required = HUB_FEATURE_REQUIRES[feature];
                const blocked = !on && required !== undefined && !state[required];
                return (
                  <li key={feature} className={cn("flex items-center gap-3 px-4 py-3", blocked && "opacity-60")}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{HUB_FEATURES[feature]}</p>
                      <p className="text-xs text-muted-foreground">
                        {HUB_FEATURE_INFO[feature]}
                        {required && ` · vyžaduje ${HUB_FEATURES[required]}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={HUB_FEATURES[feature]}
                      disabled={saving !== null}
                      onClick={() => toggle(feature)}
                      title={blocked ? `Nejdřív zapněte ${HUB_FEATURES[required!]}` : on ? "Kliknutím vypnete" : "Kliknutím zapnete"}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                        on ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 rounded-full bg-background shadow transition-transform",
                          on ? "translate-x-5.5" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
