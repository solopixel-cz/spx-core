import { z } from "zod";
import { baseFields } from "./timestamp";

/** Typ instance: 'card' = DBC vizitka (má slug), 'web' = klientský web (má hosting). */
export const instanceTypes = ["card", "web"] as const;
export type InstanceType = (typeof instanceTypes)[number];

/** Poskytovatelé hostingu pro web (pevný výběr). */
export const hostingProviders = [
  "Vercel",
  "Wedos",
  "Forpsi",
  "Netlify",
  "Cloudflare",
] as const;

export const instanceSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1),
  type: z.enum(instanceTypes).default("card"),
  advisorSlug: z.string().optional(), // povinný jen pro vizitku (type === 'card')
  hosting: z.string().optional(), // jen pro web (type === 'web')
  domain: z.string().min(1),
  status: z.enum(["setup", "live", "maintenance", "offline"]),
  repoUrl: z.string().url().optional(),
  deployUrl: z.string().url().optional(),
  features: z.array(z.string()),
  notes: z.string().optional(),
});

export type Instance = z.infer<typeof instanceSchema>;

/** Base pro create/edit formy (bez cross-field validace, aby šel použít .partial() pro PATCH). */
const instanceFormBase = z.object({
  type: z.enum(instanceTypes),
  advisorSlug: z.string().optional(),
  hosting: z.string().optional(),
  domain: z.string().min(1, "Doména je povinná"),
  status: z.enum(["setup", "live", "maintenance", "offline"]),
  repoUrl: z.string().url("Zadejte platné URL").or(z.literal("")).optional(),
  deployUrl: z.string().url("Zadejte platné URL").or(z.literal("")).optional(),
  features: z.string().optional(),
  notes: z.string().optional(),
});

/** Create (POST) — vyžaduje slug u vizitky. */
export const instanceFormSchema = instanceFormBase.superRefine((data, ctx) => {
  if (data.type === "card" && !data.advisorSlug?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["advisorSlug"],
      message: "Slug je povinný pro vizitku",
    });
  }
});

/** Partial (PATCH) — lenivé, klient validuje plným schématem. */
export const instanceFormPartialSchema = instanceFormBase.partial();

export type InstanceFormData = z.infer<typeof instanceFormBase>;
