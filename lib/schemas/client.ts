import { z } from "zod";
import { baseFields } from "./timestamp";

export const clientSchema = z.object({
  ...baseFields,
  name: z.string().min(1),
  company: z.string().optional(),
  ico: z.string().optional(),
  dic: z.string().optional(),
  billingStreet: z.string().optional(),
  billingZip: z.string().optional(),
  billingCity: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  status: z.enum(["onboarding", "active", "paused", "churned"]),
  advisorSlug: z.string().min(1),
  salesOwnerUid: z.string().optional(),
  notes: z.string().optional(),
  leadId: z.string().optional(),
});

export type Client = z.infer<typeof clientSchema>;

/** Schema for create/edit forms (no base fields) */
export const clientFormSchema = z.object({
  name: z.string().min(1, "Jméno je povinné"),
  company: z.string().optional(),
  ico: z.string().optional(),
  dic: z.string().optional(),
  billingStreet: z.string().optional(),
  billingZip: z.string().optional(),
  billingCity: z.string().optional(),
  email: z.string().email("Zadejte platný e-mail"),
  phone: z.string().optional(),
  status: z.enum(["onboarding", "active", "paused", "churned"]),
  advisorSlug: z.string().min(1, "Slug je povinný"),
  notes: z.string().optional(),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;
