import { z } from "zod";
import { baseFields } from "./timestamp";

/**
 * Vlastní e-mailové šablony pro email marketing — na rozdíl od transakčních
 * šablon v `templates/*` (jen předmět) jde o plnohodnotné HTML šablony, které
 * si uživatel vytváří a spravuje ručně.
 */
export const emailTemplateSchema = z.object({
  ...baseFields,
  name: z.string().min(1),
  subject: z.string().optional(),
  html: z.string(),
});

export type EmailTemplate = z.infer<typeof emailTemplateSchema>;

export const emailTemplateFormSchema = z.object({
  name: z.string().trim().min(1, "Název je povinný").max(120, "Název je příliš dlouhý"),
  subject: z.string().trim().max(300, "Předmět je příliš dlouhý").optional(),
  html: z.string().max(200_000, "HTML je příliš velké"),
});

export type EmailTemplateFormData = z.infer<typeof emailTemplateFormSchema>;
