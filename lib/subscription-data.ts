import type { DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import type { SubData, SubInstanceOption } from "@/components/subscriptions/subscription-card";

/** Firestore dokument předplatného → data pro UI. Chybějící `service` = vizitka. */
export function toSubData(doc: DocumentSnapshot): SubData {
  const s = doc.data() ?? {};
  return {
    id: doc.id,
    service: (s.service as SubData["service"] | undefined) ?? "card",
    plan: (s.plan as string | undefined) ?? null,
    label: (s.label as string | undefined) ?? null,
    instanceId: (s.instanceId as string | undefined) ?? null,
    priceMonthly: s.priceMonthly as number,
    billingCycle: s.billingCycle as string,
    status: s.status as string,
    startedAt: s.startedAt?.toDate?.()?.toISOString() ?? null,
    nextInvoiceAt: s.nextInvoiceAt?.toDate?.()?.toISOString() ?? null,
    discountPercent: (s.discountPercent as number | undefined) ?? 0,
    discountNote: (s.discountNote as string | undefined) ?? "",
    internal: (s.internal as boolean | undefined) ?? false,
  };
}

/** Vizitky / weby klienta pro volitelnou vazbu předplatného. */
export async function loadSubInstanceOptions(
  db: Firestore,
  clientId: string
): Promise<SubInstanceOption[]> {
  const snap = await db.collection("instances").where("clientId", "==", clientId).get();
  return snap.docs
    .filter((d) => !d.data().deletedAt)
    .map((d) => ({
      id: d.id,
      type: (d.data().type as string | undefined) ?? "card",
      domain: d.data().domain as string,
    }));
}
