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
  industry: opt(200),
  product: opt(100),
  plan: opt(100),
  teamType: opt(50),
  teamSize: z.union([z.string(), z.number()]).optional(),
  message: opt(3000),
  link: opt(500), // kde klienta najít (web, sítě)
  note: opt(3000), // volná poznámka; web na konec přidává řádek „Zdroj: …"
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
 * Odstraní poslední řádek „Zdroj: …", který web přidává do poznámky jako
 * zálohu atribuce. Zdroj se ukládá strukturovaně, v poznámce by byl dvakrát.
 */
export function stripSourceLine(note: string | undefined): string | undefined {
  if (!note) return undefined;
  const cleaned = note.replace(/\n*\s*Zdroj:[^\n]*=[^\n]*\s*$/u, "").trim();
  return cleaned || undefined;
}
