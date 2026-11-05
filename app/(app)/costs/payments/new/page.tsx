import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { monthKey, monthLabel, paymentId } from "@/lib/costs";
import { paymentFromDoc, serviceFromDoc } from "@/lib/cost-store";
import { FormPage } from "@/components/form-page";
import { CostPaymentForm } from "@/components/costs/cost-payment-form";

/** Zápis (nebo úprava) skutečné platby služby za měsíc: ?serviceId=…&month=YYYY-MM */
export default async function CostPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string; month?: string }>;
}) {
  await requireRole("admin", "member");
  const { serviceId, month: rawMonth } = await searchParams;
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

  return (
    <FormPage
      backHref={`/costs?month=${month}`}
      breadcrumbs={[{ label: "Náklady", href: `/costs?month=${month}` }, { label: service.name }]}
      title={payment ? "Upravit platbu" : "Zapsat platbu"}
      description={`${service.name} za ${monthLabel(month)}. Cizí měna se přepočte kurzem ČNB ke dni platby.`}
    >
      <CostPaymentForm service={service} month={month} payment={payment} />
    </FormPage>
  );
}
