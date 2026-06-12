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

/** Schema for create/edit forms */
export const instanceFormSchema = z.object({
  advisorSlug: z.string().min(1, "Slug je povinný"),
  domain: z.string().min(1, "Doména je povinná"),
  status: z.enum(["setup", "live", "maintenance", "offline"]),
  version: z.string().min(1, "Verze je povinná"),
  repoUrl: z.string().url("Zadejte platné URL").or(z.literal("")).optional(),
  deployUrl: z.string().url("Zadejte platné URL").or(z.literal("")).optional(),
  features: z.string().optional(),
  notes: z.string().optional(),
});

export type InstanceFormData = z.infer<typeof instanceFormSchema>;
