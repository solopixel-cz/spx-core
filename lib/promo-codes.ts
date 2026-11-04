import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  normalizePromoCode,
  promoStatus,
  type PromoCodeData,
  type PromoInvalidReason,
} from "@/lib/schemas/promo-code";

export const PROMO_COLLECTION = "promoCodes";

export type PromoCheck =
  | { valid: true; code: string; description: string | null }
  | { valid: false; code: string; reason: PromoInvalidReason };

function toPromo(data: FirebaseFirestore.DocumentData): PromoCodeData {
  return {
    code: data.code,
    description: data.description ?? null,
    validUntil: data.validUntil,
    maxUses: data.maxUses ?? null,
    usedCount: data.usedCount ?? 0,
    active: data.active !== false,
  };
}

function check(code: string, data: FirebaseFirestore.DocumentData | undefined): PromoCheck {
  if (!data) return { valid: false, code, reason: "not_found" };
  const promo = toPromo(data);
  const status = promoStatus(promo);
  if (status !== "active") return { valid: false, code, reason: status };
  return { valid: true, code, description: promo.description };
}

/** Ověří kód bez zápisu (živá kontrola ve formuláři na webu). */
export async function checkPromoCode(raw: string): Promise<PromoCheck> {
  const code = normalizePromoCode(raw);
  if (!code) return { valid: false, code, reason: "not_found" };
  const snap = await getAdminFirestore().collection(PROMO_COLLECTION).doc(code).get();
  return check(code, snap.data());
}

/**
 * Ověří kód a započítá jedno použití uvnitř transakce poptávky, takže limit
 * `maxUses` nejde přečerpat souběžnými odesláními.
 */
export async function redeemPromoCode(tx: Transaction, raw: string): Promise<PromoCheck> {
  const code = normalizePromoCode(raw);
  if (!code) return { valid: false, code, reason: "not_found" };
  const ref = getAdminFirestore().collection(PROMO_COLLECTION).doc(code);
  const snap = await tx.get(ref);
  const result = check(code, snap.data());
  if (result.valid) {
    tx.update(ref, {
      usedCount: FieldValue.increment(1),
      lastUsedAt: FieldValue.serverTimestamp(),
    });
  }
  return result;
}
