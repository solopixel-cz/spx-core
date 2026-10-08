/**
 * Funkce klientské zóny, které tým zapíná u klienta (`clients.hubFeatures`).
 * Chybějící hodnota = vypnuto (budoucí placený doplněk). Hub čte stejná pole.
 */
export const HUB_FEATURES = {
  stats: "Statistiky",
  references: "Reference",
} as const;

export type HubFeature = keyof typeof HUB_FEATURES;
export type HubFeatures = Record<HubFeature, boolean>;

export function isHubFeature(value: unknown): value is HubFeature {
  return typeof value === "string" && value in HUB_FEATURES;
}

export function hubFeaturesFrom(data: Record<string, unknown> | undefined): HubFeatures {
  const raw = (data?.hubFeatures ?? {}) as Partial<Record<HubFeature, unknown>>;
  return { stats: raw.stats === true, references: raw.references === true };
}
