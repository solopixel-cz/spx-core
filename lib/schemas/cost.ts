import { z } from "zod";
import { BILLING_LABELS, COST_CATEGORIES, CURRENCIES } from "@/lib/costs";

const amountString = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,2})?$/, "Zadejte částku, např. 20 nebo 19,99");

/** Částka z formuláře ("19,99") → číslo. */
export const parseAmount = (value: string) => Number(value.replace(",", "."));

const categoryKeys = Object.keys(COST_CATEGORIES) as [keyof typeof COST_CATEGORIES, ...(keyof typeof COST_CATEGORIES)[]];
const billingKeys = Object.keys(BILLING_LABELS) as [keyof typeof BILLING_LABELS, ...(keyof typeof BILLING_LABELS)[]];

/** Služba (data jako yyyy-mm-dd z <input type="date">). */
export const costServiceFormSchema = z
  .object({
    name: z.string().trim().min(1, "Název je povinný"),
    vendor: z.string().optional(),
    category: z.enum(categoryKeys),
    billing: z.enum(billingKeys),
    amount: amountString,
    currency: z.enum(CURRENCIES),
    nextPaymentAt: z.string().optional(),
    startedAt: z.string().min(1, "Od kdy se platí"),
    endedAt: z.string().optional(),
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.billing === "yearly" && !data.nextPaymentAt) {
      ctx.addIssue({ code: "custom", path: ["nextPaymentAt"], message: "U roční platby vyplňte příští platbu" });
    }
  });
export type CostServiceFormData = z.infer<typeof costServiceFormSchema>;

/** Skutečná platba služby za měsíc. */
export const costPaymentFormSchema = z.object({
  serviceId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Měsíc ve tvaru RRRR-MM"),
  amount: amountString,
  currency: z.enum(CURRENCIES),
  paidAt: z.string().optional(),
  note: z.string().optional(),
});
export type CostPaymentFormData = z.infer<typeof costPaymentFormSchema>;
