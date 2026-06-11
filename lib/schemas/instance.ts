import { z } from "zod";
import { baseFields } from "./timestamp";

export const instanceSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1),
  advisorSlug: z.string().min(1),
  domain: z.string().min(1),
  status: z.enum(["setup", "live", "maintenance", "offline"]),
  version: z.string().min(1),
  repoUrl: z.string().url().optional(),
  deployUrl: z.string().url().optional(),
  features: z.array(z.string()),
  notes: z.string().optional(),
});

export type Instance = z.infer<typeof instanceSchema>;
