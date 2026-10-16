/**
 * Funkce klientské zóny, které tým zapíná u klienta (`clients.hubFeatures`).
 * Chybějící hodnota = vypnuto (budoucí placený doplněk). Hub čte stejná pole.
 */
export const HUB_FEATURES = {
  stats: "Statistiky",
  statsPlus: "Rozšířené statistiky",
  references: "Reference",
} as const;

export type HubFeature = keyof typeof HUB_FEATURES;
export type HubFeatures = Record<HubFeature, boolean>;

/** Funkce, které dávají smysl jen nad jinou: Rozšířené statistiky rozšiřují základní Statistiky. */
export const HUB_FEATURE_REQUIRES: Partial<Record<HubFeature, HubFeature>> = {
  statsPlus: "stats",
};

export function isHubFeature(value: unknown): value is HubFeature {
  return typeof value === "string" && value in HUB_FEATURES;
}

export function hubFeaturesFrom(data: Record<string, unknown> | undefined): HubFeatures {
  const raw = (data?.hubFeatures ?? {}) as Partial<Record<HubFeature, unknown>>;
  return Object.fromEntries(
    (Object.keys(HUB_FEATURES) as HubFeature[]).map((f) => [f, raw[f] === true])
  ) as HubFeatures;
}

/** Funkce, které při vypnutí `feature` musí zhasnout s ní (Statistiky → Rozšířené statistiky). */
export function hubFeatureDependents(feature: HubFeature): HubFeature[] {
  return (Object.keys(HUB_FEATURE_REQUIRES) as HubFeature[]).filter((f) => HUB_FEATURE_REQUIRES[f] === feature);
}
