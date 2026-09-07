import { z } from "zod";
import { baseFields } from "./timestamp";

/**
 * Marketingový seznam kontaktů — pojmenovaná skupina příjemců (odkazy na
 * existující prospekty a klienty), komu se pošle zvolená šablona.
 */
export const marketingListSchema = z.object({
  ...baseFields,
  name: z.string().min(1),
  description: z.string().optional(),
  prospectIds: z.array(z.string()),
  clientIds: z.array(z.string()),
});

export type MarketingList = z.infer<typeof marketingListSchema>;

export const marketingListFormSchema = z.object({
  name: z.string().trim().min(1, "Název je povinný").max(120, "Název je příliš dlouhý"),
  description: z.string().trim().max(500, "Popis je příliš dlouhý").optional(),
});

export type MarketingListFormData = z.infer<typeof marketingListFormSchema>;

/** Aktualizace členů seznamu (přidání/odebrání kontaktů). */
export const marketingListMembersSchema = z.object({
  prospectIds: z.array(z.string()).max(10000).optional(),
  clientIds: z.array(z.string()).max(10000).optional(),
});
