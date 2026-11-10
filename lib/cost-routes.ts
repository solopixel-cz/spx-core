import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { cnbRates } from "@/lib/cnb";
import { monthKey, monthLabel, paymentId, type CostDomain } from "@/lib/costs";
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

/**
 * Data přehledu nákladů (Náklady i nástěnka): služby, platby od `fromMonth`,
 * domény s cenou (archivovaný klient = už neplatíme) a kurzy ČNB.
 */
export async function loadCostData(fromMonth: string) {
  const db = getAdminFirestore();
  const [servicesSnap, paymentsSnap, domainsSnap, clientsSnap, { rates, approx }] = await Promise.all([
    db.collection("costServices").get(),
    db.collection("costPayments").where("month", ">=", fromMonth).get(),
    db.collection("domains").get(),
    db.collection("clients").get(),
    cnbRates(),
  ]);

  const services = servicesSnap.docs.map(serviceFromDoc).sort((a, b) => a.name.localeCompare(b.name, "cs"));
  const clients = new Map(clientsSnap.docs.map((d) => [d.id, d.data()]));
  const domains: CostDomain[] = domainsSnap.docs
    .map((doc) => {
      const d = doc.data();
      const client = d.clientId ? clients.get(d.clientId as string) : null;
      if (typeof d.price !== "number" || d.price <= 0 || client?.deletedAt) return null;
      return {
        id: doc.id,
        name: d.name as string,
        clientName: (client?.name as string | undefined) ?? null,
        price: d.price,
        renewalAt: d.renewalAt?.toDate?.()?.toISOString() ?? null,
      };
    })
    .filter((d): d is CostDomain => d !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));

  return {
    services,
    payments: paymentsSnap.docs.map(paymentFromDoc),
    domains,
    domainCount: domainsSnap.size,
    rates,
    ratesApprox: approx,
  };
}
