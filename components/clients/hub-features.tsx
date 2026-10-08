"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { HUB_FEATURES, type HubFeature, type HubFeatures } from "@/lib/hub-features";

/** Přepínače funkcí klientské zóny (Statistiky, Reference) u klienta. */
export function HubFeaturesToggles({ clientId, features }: { clientId: string; features: HubFeatures }) {
  const router = useRouter();
  const [state, setState] = useState(features);
  const [saving, setSaving] = useState<HubFeature | null>(null);

  async function toggle(feature: HubFeature) {
    const enabled = !state[feature];
    setSaving(feature);
    setState((s) => ({ ...s, [feature]: enabled }));
    try {
      const res = await fetch(`/api/clients/${clientId}/hub-features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, enabled }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Nepodařilo se uložit");
      toast.success(`${HUB_FEATURES[feature]} v klientské zóně ${enabled ? "zapnuto" : "vypnuto"}`);
      router.refresh();
    } catch (err) {
      setState((s) => ({ ...s, [feature]: !enabled }));
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
        return (
          <button
            key={feature}
            type="button"
            role="switch"
            aria-checked={on}
            disabled={saving !== null}
            onClick={() => toggle(feature)}
            title={on ? "Kliknutím vypnete" : "Kliknutím zapnete"}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium transition-colors disabled:opacity-60",
              on
                ? "border-primary bg-primary/10 text-primary"
                : "border-dashed text-muted-foreground hover:border-foreground/40 hover:text-foreground"
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
