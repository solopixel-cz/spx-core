/**
 * Odkazy v textu zpráv vlákna Zpětné vazby (HUB ↔ CRM). Text zůstává čistý,
 * odkaz se pozná při zobrazení:
 * - `[zde je ukázka](https://…)` → odkaz s textem „zde je ukázka“,
 * - holá adresa `https://…` → odkaz s adresou.
 * Jen http(s), žádné HTML. Stejný soubor je ve spx-core i spx-hub.
 */

export type MessagePart = { type: "text"; text: string } | { type: "link"; text: string; href: string };

// [text](https://adresa) nebo holá https://adresa (bez interpunkce na konci věty).
const LINK_RE = /\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]*[^\s<>().,;:!?"'„“])/gi;

export function parseMessageLinks(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const index = m.index ?? 0;
    if (index > last) parts.push({ type: "text", text: text.slice(last, index) });
    if (m[2]) parts.push({ type: "link", text: m[1]!.trim() || m[2], href: m[2] });
    else parts.push({ type: "link", text: m[3]!, href: m[3]! });
    last = index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}

/** Pro e-mail v prostém textu: „zde je ukázka (https://…)“. */
export function messageToPlainText(text: string): string {
  return parseMessageLinks(text)
    .map((p) => (p.type === "link" && p.text !== p.href ? `${p.text} (${p.href})` : p.text))
    .join("");
}
