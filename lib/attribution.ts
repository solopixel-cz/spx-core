/** Zdroj návštěvy u poptávky z webu (`prospects.attribution`). */
export interface Attribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPage: string | null;
}

/** `utm_source=direct` posílá web, když zdroj nezná. */
export const DIRECT_SOURCE = "direct";

/** Zdroj pro souhrny a filtry: utm_source, jinak referrer, jinak „direct". */
export function sourceKey(a: Partial<Attribution> | null | undefined): string {
  return a?.utmSource || a?.referrer || DIRECT_SOURCE;
}

export function sourceLabel(key: string): string {
  return key === DIRECT_SOURCE ? "Přímo / neznámý" : key;
}

/** Krátký popis zdroje do notifikace a aktivity, např. „letak / print · podzim-2026". */
export function attributionSummary(a: Partial<Attribution> | null | undefined): string {
  if (!a) return "";
  const main = [a.utmSource, a.utmMedium].filter(Boolean).join(" / ");
  const parts = [
    main && a.utmSource === DIRECT_SOURCE && !a.utmMedium ? sourceLabel(DIRECT_SOURCE) : main,
    a.utmCampaign,
    !a.utmSource && a.referrer ? `z ${a.referrer}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Poptávky z doby před ukládáním zdroje (do 1.14.0) atribuci nemají. */
export const NO_DATA_SOURCE = "__none__";

/** Klíč zdroje pro seznam: starší poptávka bez atribuce má vlastní skupinu. */
export function listSourceKey(a: Partial<Attribution> | null | undefined): string {
  return a ? sourceKey(a) : NO_DATA_SOURCE;
}

export function listSourceLabel(key: string): string {
  return key === NO_DATA_SOURCE ? "Bez údaje (starší)" : sourceLabel(key);
}
