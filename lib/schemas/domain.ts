import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

export const domainSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1).nullable(), // null = zatím nepřiřazená (správa domén /domains)
  name: z.string().min(1), // doména, např. jmeno.cz
  registrar: z.string().optional(), // u koho zakoupena (Wedos, Forpsi, …)
  account: z.string().optional(), // pod jakým účtem je vedena
  hosting: z.string().optional(), // kde web/DNS běží (Vercel, Wedos, Forpsi, …) — odlišné od registrátora
  purchasedAt: timestampSchema.optional(), // kdy zakoupena
  renewalAt: timestampSchema.optional(), // datum obnovení/expirace — pohání připomínky
  autoRenew: z.boolean().optional(), // automatické obnovení zapnuto (netlačí připomínku)
  price: z.number().nonnegative().nullable().optional(), // cena obnovení v Kč za rok (náklady /costs)
  note: z.string().optional(),
  renewalReminderSentAt: timestampSchema.optional(), // throttle cron připomínky
});

export type Domain = z.infer<typeof domainSchema>;

/** Schema for create/edit forms (data jako yyyy-mm-dd string z <input type="date">) */
export const domainFormSchema = z.object({
  name: z.string().min(1, "Doména je povinná"),
  clientId: z.string().optional(), // jen ve správě domén; "" = bez klienta
  registrar: z.string().optional(),
  account: z.string().optional(),
  hosting: z.string().optional(),
  purchasedAt: z.string().optional(),
  renewalAt: z.string().optional(),
  autoRenew: z.boolean().optional(),
  price: z.string().trim().regex(/^\d*([.,]\d{1,2})?$/, "Jen částka v Kč, např. 289").optional(), // "" = bez ceny
  note: z.string().optional(),
});

export type DomainFormData = z.infer<typeof domainFormSchema>;

/** Cena z formuláře ("289", "289,50") → číslo; "" smaže (null), undefined ponechá. */
export function parsePrice(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  if (value.trim() === "") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
