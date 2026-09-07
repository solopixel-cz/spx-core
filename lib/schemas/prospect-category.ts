import { z } from "zod";
import { baseFields } from "./timestamp";

/**
 * Výchozí kategorie kontaktů pro oslovení. Vždy nabízené (bez zápisu do DB) —
 * uživatelem vytvořené kategorie se k nim přidávají z kolekce `prospectCategories`.
 */
export const DEFAULT_PROSPECT_CATEGORIES = [
  "Finanční poradce",
  "Realitní makléř",
  "Řemeslník",
  "Obchodník",
  "Osobnost",
] as const;

export const prospectCategorySchema = z.object({
  ...baseFields,
  name: z.string().min(1),
});

export type ProspectCategory = z.infer<typeof prospectCategorySchema>;

export const prospectCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "Název kategorie je povinný").max(60, "Název je příliš dlouhý"),
});

export type ProspectCategoryFormData = z.infer<typeof prospectCategoryFormSchema>;
