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
