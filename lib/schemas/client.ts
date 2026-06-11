import { z } from "zod";
import { baseFields } from "./timestamp";

export const clientSchema = z.object({
  ...baseFields,
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  status: z.enum(["onboarding", "active", "paused", "churned"]),
  advisorSlug: z.string().min(1),
  notes: z.string().optional(),
  leadId: z.string().optional(),
});

export type Client = z.infer<typeof clientSchema>;
