"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { HUB_FEATURES, HUB_FEATURE_REQUIRES, hubFeatureDependents, type HubFeature, type HubFeatures } from "@/lib/hub-features";

/** Přepínače funkcí SoloPixel HUB (Statistiky, Rozšířené statistiky, Reference) u klienta. */
export function HubFeaturesToggles({ clientId, features }: { clientId: string; features: HubFeatures }) {
  const router = useRouter();
  const [state, setState] = useState(features);
  const [saving, setSaving] = useState<HubFeature | null>(null);

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
    <div className="flex basis-full flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span>Funkce v hubu:</span>
      {(Object.keys(HUB_FEATURES) as HubFeature[]).map((feature) => {
        const on = state[feature];
        const required = HUB_FEATURE_REQUIRES[feature];
        const blocked = !on && required !== undefined && !state[required];
        return (
          <button
            key={feature}
            type="button"
            role="switch"
            aria-checked={on}
            disabled={saving !== null}
            onClick={() => toggle(feature)}
            title={blocked ? `Nejdřív zapněte ${HUB_FEATURES[required!]}` : on ? "Kliknutím vypnete" : "Kliknutím zapnete"}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium transition-colors disabled:opacity-60",
              on
                ? "border-primary bg-primary/10 text-primary"
                : "border-dashed text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              blocked && "opacity-50"
            )}
          >
            {on && <Check className="h-3 w-3" />}
            {HUB_FEATURES[feature]}
            <span className="font-normal opacity-70">{on ? "zapnuto" : "vypnuto"}</span>
          </button>
        );
      })}
    </div>
  );
}
