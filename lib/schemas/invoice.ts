import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

/** Přednastavené hodnoty slevy (v %). 0 = bez slevy. */
export const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30] as const;

/** Řádek faktury. */
export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Zadejte popis"),
  quantity: z.coerce.number().positive("Množství > 0"),
  unitPrice: z.coerce.number().nonnegative("Cena ≥ 0"),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

/** Cena řádku po slevě, zaokrouhlená na celé koruny. */
export function invoiceLineTotal(item: {
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
}): number {
  return Math.round(
    item.quantity * item.unitPrice * (1 - (item.discountPercent ?? 0) / 100)
  );
}

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

/** Aktuální období ve tvaru MM/RRRR (např. "08/2026"). */
export function currentPeriod(date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${mm}/${date.getFullYear()}`;
}

/**
 * Rozbalí zástupné symboly v popisu položky podle data:
 *   {obdobi} → MM/RRRR, {mesic} → MM, {rok} → RRRR
 * Použije se při vystavení faktury (i z šablony / cronu), takže popis
 * „Digitální vizitka PRO RŮST {obdobi}" se stane „… 08/2026".
 */
export function expandPeriodPlaceholders(text: string, date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return text
    .replace(/\{obdobi\}/gi, `${mm}/${yyyy}`)
    .replace(/\{mesic\}/gi, mm)
    .replace(/\{rok\}/gi, yyyy);
}

/** Součet položek (řádky po slevě, zaokrouhlené). */
export function invoiceItemsTotal(
  items: { quantity: number; unitPrice: number; discountPercent?: number }[]
): number {
  return items.reduce((sum, i) => sum + invoiceLineTotal(i), 0);
}
