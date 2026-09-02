/**
 * Konzervativní sanitizace rich-textu z editoru oslovovacího e-mailu.
 *
 * Povolené tagy: <p> <br> <strong> <b> <em> <i> <u> <a href>.
 * Vše ostatní (včetně <script>/<style>, on* atributů, stylů, tříd) se odstraní.
 * U <a> zůstává jen bezpečný href (http(s)/mailto/tel) + target/rel.
 *
 * Není to plnohodnotný DOM sanitizer — obsah tvoří jen důvěryhodní přihlášení
 * uživatelé (editor navíc vkládá jen b/i/a a paste je plain-text) a náhled
 * běží v sandboxovaném iframe. Slouží jako obranná vrstva před uložením do DB
 * a odesláním e-mailu.
 */
const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "a"]);

export function sanitizeRichHtml(input: string): string {
  if (!input) return "";

  let html = input;

  // 1) Odstranit celé bloky script/style i s obsahem.
  html = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");

  // 2) Otevírací (a self-closing) tagy — projít allowlistem.
  html = html.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*?)\/?>/g,
    (_match, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";

      if (tag === "a") {
        const hrefMatch = attrs.match(
          /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
        );
        const href = (hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "").trim();
        if (/^(https?:|mailto:|tel:)/i.test(href)) {
          const safe = href.replace(/"/g, "&quot;").replace(/</g, "&lt;");
          return `<a href="${safe}" target="_blank" rel="noopener noreferrer">`;
        }
        return "<a>";
      }

      // Ostatní povolené tagy — zahodit všechny atributy.
      return `<${tag}>`;
    }
  );

  // 3) Zavírací tagy — nechat jen povolené.
  html = html.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)\s*>/g, (_m, rawTag: string) => {
    const tag = rawTag.toLowerCase();
    return ALLOWED_TAGS.has(tag) ? `</${tag}>` : "";
  });

  return html.trim();
}

/** Prostý text — odstraní veškeré HTML tagy a normalizuje bílé znaky. */
export function stripHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
