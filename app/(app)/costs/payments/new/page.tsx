import { loadCostPaymentForm } from "@/lib/cost-routes";
import { FormPage } from "@/components/form-page";
import { CostPaymentForm } from "@/components/costs/cost-payment-form";

/** Zápis (nebo úprava) skutečné platby služby za měsíc: ?serviceId=…&month=YYYY-MM */
export default async function CostPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string; month?: string }>;
}) {
  const { serviceId, month: rawMonth } = await searchParams;
  const { service, month, payment, title, description } = await loadCostPaymentForm(serviceId, rawMonth);

  return (
    <FormPage
      backHref={`/costs?month=${month}`}
      breadcrumbs={[{ label: "Náklady", href: `/costs?month=${month}` }, { label: service.name }]}
      title={title}
      description={description}
    >
      <CostPaymentForm service={service} month={month} payment={payment} />
    </FormPage>
  );
}
