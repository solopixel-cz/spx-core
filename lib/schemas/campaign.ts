import { z } from "zod";
import { baseFields } from "./timestamp";

/**
 * Marketingová kampaň — odeslání zvolené šablony na zvolený seznam kontaktů.
 * Per-příjemce se zakládá záznam v `campaignEmails` (tracking otevření/proklik
 * přes Resend webhook, stejně jako outreachEmails).
 */
export const campaignSchema = z.object({
  ...baseFields,
  name: z.string().min(1),
  templateId: z.string(),
  templateName: z.string().optional(),
  listId: z.string(),
  listName: z.string().optional(),
  subject: z.string().optional(),
  status: z.enum(["sending", "sent", "failed"]),
  totalRecipients: z.number(),
  sentCount: z.number(),
  failedCount: z.number(),
  sentAt: z.any().optional(),
});

export type Campaign = z.infer<typeof campaignSchema>;

/** Vytvoření/odeslání kampaně. testEmail → jen testovací odeslání (bez záznamu). */
export const campaignCreateSchema = z.object({
  templateId: z.string().min(1, "Vyberte šablonu"),
  listId: z.string().optional(),
  name: z.string().trim().max(160).optional(),
  testEmail: z.string().email().optional(),
});

export type CampaignCreateData = z.infer<typeof campaignCreateSchema>;
