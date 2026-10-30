import { z } from "zod";

/**
 * Promo kódy pro poptávkový formulář na webu (spx-web /kontakt).
 * Kód je zároveň ID dokumentu v `promoCodes` (velká písmena), takže je unikátní.
 */
export const PROMO_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,29}$/;

/** Sjednotí zápis kódu: bez mezer, velkými písmeny. */
export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neplatné datum");

export const promoCodeCreateSchema = z.object({
  code: z
    .string()
    .transform(normalizePromoCode)
    .pipe(z.string().regex(PROMO_CODE_PATTERN, "Kód musí mít 3 až 30 znaků: písmena, čísla a pomlčky")),
  description: z.string().trim().max(300).optional().transform((v) => v || null),
  validUntil: dateString,
  maxUses: z.number().int().positive().nullable().optional().transform((v) => v ?? null),
});

export const promoCodeUpdateSchema = z.object({
  description: z.string().trim().max(300).nullable().optional(),
  validUntil: dateString.optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
});

export type PromoCodeCreate = z.infer<typeof promoCodeCreateSchema>;
export type PromoCodeUpdate = z.infer<typeof promoCodeUpdateSchema>;

export interface PromoCodeData {
  code: string;
  description: string | null;
  /** Poslední den platnosti (YYYY-MM-DD, včetně), počítá se v čase Europe/Prague. */
  validUntil: string;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
}

export type PromoInvalidReason = "not_found" | "inactive" | "expired" | "exhausted";

export type PromoStatus = "active" | Exclude<PromoInvalidReason, "not_found">;

/** Dnešní datum v Praze jako YYYY-MM-DD (porovnává se s `validUntil`). */
export function todayInPrague(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(now);
}

/** Stav kódu; `active` = dá se použít. Pořadí: vypnutý, vypršelý, vyčerpaný. */
export function promoStatus(promo: PromoCodeData, now = new Date()): PromoStatus {
  if (!promo.active) return "inactive";
  if (promo.validUntil < todayInPrague(now)) return "expired";
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return "exhausted";
  return "active";
}
