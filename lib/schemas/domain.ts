import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

export const domainSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1),
  name: z.string().min(1), // doména, např. jmeno.cz
  registrar: z.string().optional(), // u koho zakoupena (Wedos, Forpsi, …)
  account: z.string().optional(), // pod jakým účtem je vedena
  purchasedAt: timestampSchema.optional(), // kdy zakoupena
  renewalAt: timestampSchema.optional(), // datum obnovení/expirace — pohání připomínky
  autoRenew: z.boolean().optional(), // automatické obnovení zapnuto (netlačí připomínku)
  note: z.string().optional(),
  renewalReminderSentAt: timestampSchema.optional(), // throttle cron připomínky
});

export type Domain = z.infer<typeof domainSchema>;

/** Schema for create/edit forms (data jako yyyy-mm-dd string z <input type="date">) */
export const domainFormSchema = z.object({
  name: z.string().min(1, "Doména je povinná"),
  registrar: z.string().optional(),
  account: z.string().optional(),
  purchasedAt: z.string().optional(),
  renewalAt: z.string().optional(),
  autoRenew: z.boolean().optional(),
  note: z.string().optional(),
});

export type DomainFormData = z.infer<typeof domainFormSchema>;
