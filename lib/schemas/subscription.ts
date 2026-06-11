import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

export const subscriptionSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1),
  plan: z.enum(["basic", "standard", "premium"]),
  priceMonthly: z.number().nonnegative(),
  billingCycle: z.enum(["monthly", "yearly"]),
  status: z.enum(["trial", "active", "past_due", "cancelled"]),
  startedAt: timestampSchema,
  nextInvoiceAt: timestampSchema,
});

export type Subscription = z.infer<typeof subscriptionSchema>;
