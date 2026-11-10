"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrackingInstance {
  id: string;
  ga4PropertyId?: string;
  ga4ConnectedAt?: string | null;
  searchConsoleConnectedAt?: string | null;
}

const CHECKS = [
  {
    key: "ga4Connected",
    field: "ga4ConnectedAt",
    label: "Google Analytics",
    hint: "Service account HUBu má v GA4 roli Viewer a v CRM je Property ID.",
  },
  {
    key: "searchConsoleConnected",
    field: "searchConsoleConnectedAt",
    label: "Search Console",
    hint: "Web je v Search Console ověřený a service account HUBu je přidaný jako uživatel.",
  },
] as const;

/**
 * Ruční kontrola měření webu (GA4, Search Console). Klik přepne stav,
 * zaškrtnutí uloží datum. Bez napojení HUB u webu statistiky neukáže.
 */
export function TrackingChecks({ instance }: { instance: TrackingInstance }) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, boolean>>({
    ga4Connected: !!instance.ga4ConnectedAt,
    searchConsoleConnected: !!instance.searchConsoleConnectedAt,
  });
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(key: (typeof CHECKS)[number]["key"]) {
    const next = !state[key];
    setState((s) => ({ ...s, [key]: next }));
    setSaving(key);
    try {
      const res = await fetch(`/api/instances/${instance.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setState((s) => ({ ...s, [key]: !next }));
      toast.error("Nepodařilo se uložit kontrolu měření");
    } finally {
      setSaving(null);
    }
  }

  const missingPropertyId = state.ga4Connected && !instance.ga4PropertyId;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1.5">
        {CHECKS.map((c) => {
          const on = state[c.key];
          const at = instance[c.field];
          return (
            <button
              key={c.key}
              type="button"
              disabled={saving === c.key}
              aria-pressed={on}
              onClick={() => toggle(c.key)}
              title={
                on && at
                  ? `${c.label}: napojeno ${new Date(at).toLocaleDateString("cs-CZ")}`
                  : `${c.label}: nenapojeno. ${c.hint}`
              }
              className={cn(
                "relative inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                on
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-dashed border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950",
              )}
            >
              {on ? <Check className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
              {c.label}
            </button>
          );
        })}
      </div>
      {missingPropertyId && (
        <span className="text-xs text-amber-700 dark:text-amber-400">Chybí Property ID z GA4</span>
      )}
    </div>
  );
}
