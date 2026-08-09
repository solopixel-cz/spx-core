import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

/** Řádek faktury. */
export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Zadejte popis"),
  quantity: z.coerce.number().positive("Množství > 0"),
  unitPrice: z.coerce.number().nonnegative("Cena ≥ 0"),
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

export const invoiceSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1),
  number: z.string().min(1),
  amount: z.number().nonnegative(), // souhrn (= součet položek, pokud jsou)
  items: z.array(invoiceItemSchema).optional(),
  variableSymbol: z.string().optional(),
  subscriptionId: z.string().optional(),
  note: z.string().optional(),
  issuedAt: timestampSchema,
  dueAt: timestampSchema,
  paidAt: timestampSchema.optional(),
  sentAt: timestampSchema.optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  pdfPath: z.string().optional(),
});

export type Invoice = z.infer<typeof invoiceSchema>;

/** Formulář pro vystavení i editaci faktury (řádkové položky). */
export const invoiceFormSchema = z.object({
  clientId: z.string().min(1, "Vyberte klienta"),
  items: z.array(invoiceItemSchema).min(1, "Přidejte alespoň jednu položku"),
  dueAt: z.string().min(1, "Zadejte splatnost"),
  variableSymbol: z.string().optional(),
  note: z.string().optional(),
  asDraft: z.boolean().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

/** Součet položek (množství × cena). */
export function invoiceItemsTotal(
  items: { quantity: number; unitPrice: number }[]
): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}
