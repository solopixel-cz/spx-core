import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

export const subscriptionSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1),
  plan: z.enum(["basic", "pro"]),
  priceMonthly: z.number().nonnegative(),
  billingCycle: z.enum(["monthly", "yearly"]),
  status: z.enum(["trial", "active", "past_due", "cancelled"]),
  internal: z.boolean().optional(), // interní vizitka (obchodník/vlastní) — nefakturuje se
  startedAt: timestampSchema,
  nextInvoiceAt: timestampSchema,
});

export type Subscription = z.infer<typeof subscriptionSchema>;

export const subscriptionFormSchema = z.object({
  plan: z.enum(["basic", "pro"]),
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

export type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;
