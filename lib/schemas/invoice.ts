import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

export const invoiceSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1),
  number: z.string().min(1),
  amount: z.number().nonnegative(),
  issuedAt: timestampSchema,
  dueAt: timestampSchema,
  paidAt: timestampSchema.optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  pdfPath: z.string().optional(),
});

export type Invoice = z.infer<typeof invoiceSchema>;
