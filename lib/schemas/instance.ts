import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

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
  ga4PropertyId: z.string().regex(/^\d+$/).optional(), // číselné Property ID z GA4 (statistiky v hubu)
  ga4ConnectedAt: timestampSchema.nullable().optional(), // jen web: ručně potvrzené napojení GA4
  searchConsoleConnectedAt: timestampSchema.nullable().optional(), // jen web: ručně potvrzené napojení Search Console
  domain: z.string().min(1),
  status: z.enum(["setup", "live", "maintenance", "offline"]),
  repoUrl: z.string().url().optional(),
  deployUrl: z.string().url().optional(),
  features: z.array(z.string()),
  notes: z.string().optional(),
  // Nasazení vizitky (spx-dbc v2, jen type === 'card'), propisuje se do Vercelu
  hostnames: z.array(z.string()).optional(), // vlastní adresy vizitky (doména, www)
  primaryHost: z.string().nullable().optional(), // kanonická adresa, ostatní 308 na ni
  leadEmail: z.string().email().nullable().optional(), // kam chodí poptávky z vizitky
  ga4MeasurementId: z.string().nullable().optional(), // měřicí ID G-… (vizitka měří sama)
  googleSiteVerification: z.string().nullable().optional(), // ověření Search Console (meta tag)
  frameAncestors: z.array(z.string()).optional(), // weby kanceláří, které smí vizitku vložit do iframe
});

export type Instance = z.infer<typeof instanceSchema>;

/** Formulář Nasazení vizitky (PUT /api/instances/[id]/deployment). */
export const cardDeploymentSchema = z.object({
  hostnames: z.array(z.string()).max(20),
  primaryHost: z.string().nullable(),
  leadEmail: z.string().trim().email("Zadejte platný e-mail").or(z.literal("")),
  ga4MeasurementId: z
    .string()
    .trim()
    .regex(/^(G-[A-Z0-9]+)?$/, "Měřicí ID ve tvaru G-XXXXXXX"),
  googleSiteVerification: z.string().trim().max(200),
  frameAncestors: z.array(z.string().url("Zadejte celou adresu včetně https://")).max(20),
});

export type CardDeploymentData = z.infer<typeof cardDeploymentSchema>;

/** Base pro create/edit formy (bez cross-field validace, aby šel použít .partial() pro PATCH). */
const instanceFormBase = z.object({
  type: z.enum(instanceTypes),
  advisorSlug: z.string().optional(),
  hosting: z.string().optional(),
  ga4PropertyId: z
    .string()
    .trim()
    .regex(/^\d*$/, "Jen číslice — Property ID z GA4, ne měřicí ID G-…")
    .optional(),
  domain: z.string().min(1, "Doména je povinná"),
  status: z.enum(["setup", "live", "maintenance", "offline"]),
  repoUrl: z.string().url("Zadejte platné URL").or(z.literal("")).optional(),
  deployUrl: z.string().url("Zadejte platné URL").or(z.literal("")).optional(),
  features: z.string().optional(),
  notes: z.string().optional(),
  // Kontrola měření webu (přepínače v záložce Služby), na serveru se z nich stane datum.
  ga4Connected: z.boolean().optional(),
  searchConsoleConnected: z.boolean().optional(),
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

export const instanceTypeLabels: Record<string, string> = {
  card: "Vizitka",
  web: "Web",
};

export const instanceStatusLabels: Record<string, string> = {
  setup: "Příprava",
  live: "Živá",
  maintenance: "Údržba",
  offline: "Offline",
};
