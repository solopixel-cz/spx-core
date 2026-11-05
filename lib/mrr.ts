import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { billedMonths } from "@/lib/plans";

/**
 * MRR z aktivních předplatných (Kč za měsíc po slevě). Interní vizitky se
 * nepočítají; roční předplatné se fakturuje `billedMonths` × a dělí se 12.
 */
export function computeMrr(docs: QueryDocumentSnapshot[]): number {
  let mrr = 0;
  docs.forEach((doc) => {
    const d = doc.data();
    if (d.internal) return; // interní vizitky negenerují příjem
    const price = d.priceMonthly as number;
    const discount = (d.discountPercent as number) || 0;
    // priceMonthly je vždy měsíční cena; roční vizitka se fakturuje 10× → MRR = průměr na měsíc po slevě.
    const perMonth = d.billingCycle === "yearly" ? (price * billedMonths(d)) / 12 : price;
    mrr += perMonth * (1 - discount / 100);
  });
  return Math.round(mrr);
}
