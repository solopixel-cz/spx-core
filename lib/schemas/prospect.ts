import { z } from "zod";
import { baseFields } from "./timestamp";

export const prospectStatusValues = [
  "new",
  "contacted",
  "responding",
  "not_interested",
  "unreachable",
  "converted",
] as const;

export const prospectSourceValues = ["import", "manual"] as const;

export const prospectSchema = z.object({
  ...baseFields,
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  portalUrl: z.string().optional(),
  status: z.enum(prospectStatusValues),
  ownerUid: z.string().optional(),
  claimedAt: z.any().optional(),
  lastTouchAt: z.any().optional(),
  nextFollowUpAt: z.any().optional(),
  leadId: z.string().optional(),
  source: z.enum(prospectSourceValues),
  importBatchId: z.string().optional(),
});

export type Prospect = z.infer<typeof prospectSchema>;

export const prospectFormSchema = z.object({
  name: z.string().min(1, "Jméno je povinné"),
  company: z.string().optional(),
  email: z.string().email("Zadejte platný e-mail").or(z.literal("")).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  portalUrl: z.string().url("Zadejte platnou URL").or(z.literal("")).optional(),
});

export type ProspectFormData = z.infer<typeof prospectFormSchema>;

export const contactFormSchema = z.object({
  channel: z.enum(["phone", "email", "linkedin", "in_person"]),
  result: z.enum(["no_answer", "left_message", "conversation", "email_sent"]),
  note: z.string().optional(),
  followUpAt: z.string().optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
