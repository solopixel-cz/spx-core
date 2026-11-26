import { z } from "zod";

/** Volitelný text z formuláře: ořízne mezery, prázdný řetězec = nevyplněno. */
const opt = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined));

/**
 * Veřejná poptávka z marketingového webu (spx-web, /kontakt „Návrh zdarma").
 * Přijímá jen to, co může vyplnit návštěvník — vlastníka, zdroj a stav
 * doplňuje server v ingest endpointu. Nikdy nedůvěřuj klientovi u ownerUid.
 * Pole odpovídají proxy `spx-web/pages/api/lead.ts`. Neznámá pole se tiše
 * zahodí (žádné `.strict()`), aby rozšíření webu nerozbilo příjem.
 */
export const webInquirySchema = z.object({
  name: z.string().min(1),
  email: z.string().email().or(z.literal("")).optional(),
  phone: opt(100),
  company: opt(200),
  promoCode: opt(50), // promo kód z letáku nebo akce
  industry: opt(200),
  product: opt(100),
  plan: opt(100),
  teamType: opt(50),
  teamSize: z.union([z.string(), z.number()]).optional(),
  message: opt(3000),
  link: opt(500), // kde klienta najít (web, sítě)
  note: opt(3000), // volná poznámka; web na konec přidává řádky „Odkud: …" a „Zdroj: …"
  // Místo na webu, stránka a obor (od 1.57.0, popisky v lib/web-places.ts).
  lead_source: opt(50),
  page: opt(200),
  segment: opt(100),
  // Chat s Pixelou: poslední otázky návštěvníka (bez odpovědí), max. 5.
  chat_questions: z
    .array(z.string())
    .optional()
    .transform((v) => {
      const list = (v ?? []).map((q) => q.trim().slice(0, 500)).filter(Boolean).slice(-5);
      return list.length ? list : undefined;
    }),
  // Zdroj návštěvy (atribuce kampaní). utm_source „direct" = zdroj neznámý.
  utm_source: opt(200),
  utm_medium: opt(200),
  utm_campaign: opt(200),
  utm_content: opt(200),
  referrer: opt(200),
  landing_page: opt(200),
});

export type WebInquiry = z.infer<typeof webInquirySchema>;

/**
 * Odstraní poslední řádky „Zdroj: …" a „Odkud: …", které web přidává do poznámky
 * jako zálohu atribuce a místa. Obojí se ukládá strukturovaně, v poznámce by bylo dvakrát.
 */
export function stripSourceLine(note: string | undefined): string | undefined {
  if (!note) return undefined;
  const cleaned = note
    .replace(/\n*\s*Zdroj:[^\n]*=[^\n]*\s*$/u, "")
    .replace(/\n*\s*Odkud:[^\n]*=[^\n]*\s*$/u, "")
    .trim();
  return cleaned || undefined;
}
