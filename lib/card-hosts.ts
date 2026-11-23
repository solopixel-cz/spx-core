/** Adresy vizitek (spx-dbc v2), sdílené mezi serverem a formulářem Nasazení. */

/** Záložní adresa každé vizitky: vizitka.solopixel.cz/<slug> (noindex). */
export const CARD_FALLBACK_HOST = "vizitka.solopixel.cz";

export function cardFallbackUrl(slug: string) {
  return `https://${CARD_FALLBACK_HOST}/${slug}`;
}

const HOST_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** „https://WWW.Jmeno.cz/" → „www.jmeno.cz"; neplatná adresa → null. */
export function normalizeHost(input: string): string | null {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
  return HOST_RE.test(host) ? host : null;
}

/** Apex (jmeno.cz) dostane i www, aby šly obě adresy. */
export function withWww(host: string): string[] {
  return host.split(".").length === 2 ? [host, `www.${host}`] : [host];
}
