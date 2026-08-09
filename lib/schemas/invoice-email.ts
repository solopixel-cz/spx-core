import { z } from "zod";
import { baseFields } from "./timestamp";
import { emailStatusValues } from "./email-status";

/**
 * Odeslaná faktura e-mailem klientovi — stav doručení přes stejný Resend
 * webhook jako outreachEmails/deliveryEmails. E-mail posílá CRM (ne Fakturoid),
 * aby fungoval tracking otevření/kliknutí.
 */
export const invoiceEmailSchema = z.object({
  ...baseFields,
  invoiceId: z.string().min(1),
  clientId: z.string().min(1),
  toEmail: z.string().email(),
  senderUid: z.string().min(1),
  resendId: z.string().min(1),
  subject: z.string().min(1),
  status: z.enum(emailStatusValues),
  sentAt: z.any(),
  lastEventAt: z.any().optional(),
});

export type InvoiceEmail = z.infer<typeof invoiceEmailSchema>;
