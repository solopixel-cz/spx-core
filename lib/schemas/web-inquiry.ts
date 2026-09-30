import { z } from "zod";

/**
 * Veřejná poptávka z marketingového webu (spx-web, /kontakt „Návrh zdarma").
 * Přijímá jen to, co může vyplnit návštěvník — vlastníka, zdroj a stav
 * doplňuje server v ingest endpointu. Nikdy nedůvěřuj klientovi u ownerUid.
 * Pole odpovídají proxy `spx-web/pages/api/lead.ts`.
 */
export const webInquirySchema = z.object({
  name: z.string().min(1),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  product: z.string().optional(),
  plan: z.string().optional(),
  teamType: z.string().optional(),
  teamSize: z.union([z.string(), z.number()]).optional(),
  message: z.string().optional(),
  link: z.string().max(500).optional(), // kde klienta najít (web, profil)
  note: z.string().max(3000).optional(), // volná poznámka (+ řádek se zdrojem UTM)
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
});

export type WebInquiry = z.infer<typeof webInquirySchema>;
