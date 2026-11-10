import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { monthKey, monthLabel, paymentId } from "@/lib/costs";
import { paymentFromDoc, serviceFromDoc } from "@/lib/cost-store";

/** Data pro úpravu služby (stránka i modál `/costs/services/[id]/edit`). */
export async function loadCostServiceForm(id: string) {
  await requireRole("admin", "member");
  const doc = await getAdminFirestore().collection("costServices").doc(id).get();
  if (!doc.exists) notFound();
  return serviceFromDoc(doc);
}

/** Data pro zápis platby (stránka i modál `/costs/payments/new?serviceId=…&month=YYYY-MM`). */
export async function loadCostPaymentForm(serviceId: string | undefined, rawMonth: string | undefined) {
  await requireRole("admin", "member");
  if (!serviceId) notFound();
  const month = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : monthKey(new Date());

  const db = getAdminFirestore();
  const [serviceDoc, paymentDoc] = await Promise.all([
    db.collection("costServices").doc(serviceId).get(),
    db.collection("costPayments").doc(paymentId(serviceId, month)).get(),
  ]);
  if (!serviceDoc.exists) notFound();
  const service = serviceFromDoc(serviceDoc);
  const payment = paymentDoc.exists ? paymentFromDoc(paymentDoc) : null;

  return {
    service,
    month,
    payment,
    title: payment ? "Upravit platbu" : "Zapsat platbu",
    description: `${service.name} za ${monthLabel(month)}. Cizí měna se přepočte kurzem ČNB ke dni platby.`,
  };
}

export const NEW_COST_SERVICE_DESCRIPTION =
  "Co platíme za provoz: hosting, cloud, AI, nástroje. Domény se zadávají ve správě domén.";
