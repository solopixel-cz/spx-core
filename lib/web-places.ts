/**
 * Místo na webu, odkud poptávka přišla (`prospects.inquiry.place`). Hodnoty posílá
 * spx-web (`lib/v2/lead.ts`, `LeadPlace`), `exit` zakládá příjem zpětné vazby.
 */
export const WEB_PLACES: Record<string, string> = {
  hero: "Úvod nahoře",
  cta_bottom: "Úvod dole",
  kontakt: "Kontakt",
  pixela: "Chat s Pixelou",
  obor_hero: "Obor nahoře",
  obor_cta: "Obor dole",
  o_nas: "Kdo za tím stojí",
  exit: "Dotaz při odchodu",
};

/** Obory webu (slug stránky /cs/pro/<slug>). */
export const WEB_SEGMENTS: Record<string, string> = {
  "financni-poradci": "Finanční poradci",
  "realitni-makleri": "Realitní makléři",
  remeslnici: "Řemeslníci",
  obchodnici: "Obchodníci",
  recnici: "Řečníci",
  tymy: "Týmy",
};

export function placeLabel(place: string): string {
  return WEB_PLACES[place] ?? place;
}

export function segmentLabel(segment: string): string {
  return WEB_SEGMENTS[segment] ?? segment;
}

/** Klíč místa pro souhrny: poptávky před 1.57.0 místo nemají. */
export const NO_PLACE = "__none__";

export function listPlaceKey(inquiry: { place?: string | null } | null | undefined): string {
  return inquiry?.place || NO_PLACE;
}

export function listPlaceLabel(key: string): string {
  return key === NO_PLACE ? "Bez údaje (starší)" : placeLabel(key);
}
