import { z } from "zod";
import { baseFields } from "./timestamp";

export const clientKindSchema = z.enum(["person", "company"]);
export type ClientKind = z.infer<typeof clientKindSchema>;

export const clientSchema = z.object({
  ...baseFields,
  kind: clientKindSchema.optional(), // chybí = osoba
  name: z.string().min(1), // osoba: jméno a příjmení; firma: název firmy
  contactName: z.string().optional(), // jen firma: kontaktní osoba
  company: z.string().optional(), // jen osoba: značka / síť
  ico: z.string().optional(),
  dic: z.string().optional(),
  billingStreet: z.string().optional(),
  billingZip: z.string().optional(),
  billingCity: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  status: z.enum(["onboarding", "active", "paused", "churned"]),
  advisorSlug: z.string().optional(), // jen pro vizitku; klient může mít i jen web (řeší se přes instanci)
  salesOwnerUid: z.string().optional(),
  notes: z.string().optional(),
  leadId: z.string().optional(),
});

export type Client = z.infer<typeof clientSchema>;

/** Schema for create/edit forms (no base fields) */
export const clientFormSchema = z.object({
  kind: clientKindSchema.optional(),
  name: z.string().min(1, "Vyplňte jméno / název"),
  contactName: z.string().optional(),
  company: z.string().optional(),
  ico: z.string().optional(),
  dic: z.string().optional(),
  billingStreet: z.string().optional(),
  billingZip: z.string().optional(),
  billingCity: z.string().optional(),
  email: z.string().email("Zadejte platný e-mail"),
  phone: z.string().optional(),
  status: z.enum(["onboarding", "active", "paused", "churned"]),
  advisorSlug: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;
