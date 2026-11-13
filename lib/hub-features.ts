/**
 * Funkce klientské zóny, které tým zapíná u klienta (`clients.hubFeatures`).
 * Chybějící hodnota = vypnuto (budoucí placený doplněk). Hub čte stejná pole.
 */
export const HUB_FEATURES = {
  stats: "Statistiky",
  statsPlus: "Rozšířené statistiky",
  // Vyhledávání: data z Google Search Console (zobrazení, prokliky, co lidé hledají), hub /search.
  search: "Vyhledávání",
  references: "Reference",
  // Přednášky: plánování akcí, QR, Líbila / Nelíbila a materiály posluchačům e-mailem. Na tarif vázané není, zapíná tým ručně.
  lectures: "Přednášky",
} as const;

export type HubFeature = keyof typeof HUB_FEATURES;
export type HubFeatures = Record<HubFeature, boolean>;

/** Krátký popis funkce v kartě SoloPixel HUB (detail klienta → Služby). */
export const HUB_FEATURE_INFO: Record<HubFeature, string> = {
  stats: "Návštěvy, zdroje a kontakty z GA4",
  statsPlus: "Placený doplněk: podrobné rozpady a srovnání",
  search: "Data z Google Search Console: co lidé hledají",
  references: "Sběr a zveřejnění referencí",
  lectures: "Akce, QR, hodnocení a materiály posluchačům",
};

/** Skupiny v kartě SoloPixel HUB. Nová funkce = řádek v HUB_FEATURES, HUB_FEATURE_INFO a tady. */
export const HUB_FEATURE_GROUPS: { label: string; features: HubFeature[] }[] = [
  { label: "Měření", features: ["stats", "statsPlus", "search"] },
  { label: "Obsah", features: ["references", "lectures"] },
];

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
