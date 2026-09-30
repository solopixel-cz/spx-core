import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

/** Za co se předplatné platí (fáze 34C). Chybí = vizitka (stávající data). */
export const subscriptionServices = ["card", "web", "other"] as const;
export type SubscriptionService = (typeof subscriptionServices)[number];

export const subscriptionSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1),
  service: z.enum(subscriptionServices).optional(), // chybí = 'card'
  plan: z.enum(["basic", "pro"]).optional(), // jen pro vizitku
  label: z.string().optional(), // název u webu / jiné služby („Správa webu")
  instanceId: z.string().optional(), // volitelná vazba na vizitku / web
  priceMonthly: z.number().nonnegative(),
  billingCycle: z.enum(["monthly", "yearly"]),
  status: z.enum(["trial", "active", "past_due", "cancelled"]),
  internal: z.boolean().optional(), // interní (obchodník / vlastní) — nefakturuje se
  startedAt: timestampSchema,
  nextInvoiceAt: timestampSchema,
});

export type Subscription = z.infer<typeof subscriptionSchema>;

/** Base formuláře (bez cross-field validace, ať jde .partial() pro PATCH). */
const subscriptionFormBase = z.object({
  service: z.enum(subscriptionServices),
  plan: z.enum(["basic", "pro"]).optional(),
  label: z.string().optional(),
  instanceId: z.string().optional(),
  priceMonthly: z.coerce.number().nonnegative("Zadejte kladnou cenu"),
  billingCycle: z.enum(["monthly", "yearly"]),
  status: z.enum(["trial", "active", "past_due", "cancelled"]),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  discountNote: z.string().optional(),
  internal: z.boolean().optional(),
  // Volitelné — pro import stávajících klientů. Prázdné = startedAt teď, nextInvoiceAt dopočítá API.
  startedAt: z.string().optional(),
  nextInvoiceAt: z.string().optional(),
});

/** Create — vizitka potřebuje tarif, web / jiná služba název. */
export const subscriptionFormSchema = subscriptionFormBase.superRefine((d, ctx) => {
  if (d.service === "card" && !d.plan) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["plan"], message: "Vyberte tarif" });
  }
  if (d.service !== "card" && !d.label?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["label"], message: "Zadejte název služby" });
  }
});

/** PATCH — lenivé, klient validuje plným schématem. */
export const subscriptionFormPartialSchema = subscriptionFormBase.partial();

export type SubscriptionFormData = z.infer<typeof subscriptionFormBase>;
