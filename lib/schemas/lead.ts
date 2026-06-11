import { z } from "zod";
import { baseFields } from "./timestamp";

export const leadSchema = z.object({
  ...baseFields,
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.enum(["web", "referral", "outreach", "event", "other"]),
  stage: z.enum([
    "new",
    "contacted",
    "demo",
    "offer",
    "contract",
    "onboarding",
    "won",
    "lost",
  ]),
  value: z.number().positive().optional(),
  ownerUid: z.string().min(1),
  lostReason: z.string().optional(),
  notes: z.string().optional(),
});

export type Lead = z.infer<typeof leadSchema>;

export const leadFormSchema = z.object({
  name: z.string().min(1, "Jméno je povinné"),
  company: z.string().optional(),
  email: z.string().email("Zadejte platný e-mail").or(z.literal("")).optional(),
  phone: z.string().optional(),
  source: z.enum(["web", "referral", "outreach", "event", "other"]),
  stage: z.enum([
    "new", "contacted", "demo", "offer", "contract", "onboarding", "won", "lost",
  ]),
  value: z.coerce.number().nonnegative().optional(),
  ownerUid: z.string().min(1, "Vyberte vlastníka"),
  lostReason: z.string().optional(),
  notes: z.string().optional(),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;
