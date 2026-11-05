import type { DocumentSnapshot } from "firebase-admin/firestore";
import type { CostPayment, CostService } from "@/lib/costs";

const iso = (v: unknown) =>
  (v as { toDate?: () => Date } | undefined)?.toDate?.()?.toISOString() ?? null;

export function serviceFromDoc(doc: DocumentSnapshot): CostService {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    name: d.name,
    vendor: d.vendor ?? null,
    category: d.category ?? "other",
    billing: d.billing ?? "monthly",
    amount: d.amount ?? 0,
    currency: d.currency ?? "CZK",
    nextPaymentAt: iso(d.nextPaymentAt),
    startedAt: iso(d.startedAt) ?? iso(d.createdAt) ?? new Date().toISOString(),
    endedAt: iso(d.endedAt),
    note: d.note ?? null,
  };
}

export function paymentFromDoc(doc: DocumentSnapshot): CostPayment {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    serviceId: d.serviceId,
    month: d.month,
    amount: d.amount,
    currency: d.currency ?? "CZK",
    rate: d.rate ?? 1,
    amountCzk: d.amountCzk ?? 0,
    paidAt: iso(d.paidAt),
    note: d.note ?? null,
  };
}

/** yyyy-mm-dd → Date (UTC půlnoc). "" → null, undefined → undefined. */
export function parseDate(value: string | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === "") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
