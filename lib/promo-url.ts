import { WEB_URL } from "@/lib/siteUrl";

/**
 * Odkaz na formulář /kontakt na webu s předvyplněným promo kódem (do QR kódu
 * na leták). Web kód z `?promo=` vloží do pole a hned ověří, `#form` odroluje
 * k formuláři a `utm_source=qr` se uloží jako zdroj poptávky.
 */
export function promoFormUrl(code: string): string {
  const params = new URLSearchParams({ promo: code, utm_source: "qr" });
  return `${WEB_URL}/cs/kontakt?${params}#form`;
}
