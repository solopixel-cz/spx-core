import { loadCostPaymentForm } from "@/lib/cost-routes";
import { FormModal } from "@/components/form-modal";
import { CostPaymentForm } from "@/components/costs/cost-payment-form";

/** Zápis platby jako modál nad Náklady; napřímo je to stránka. */
export default async function CostPaymentModal({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string; month?: string }>;
}) {
  const { serviceId, month: rawMonth } = await searchParams;
  const { service, month, payment, title, description } = await loadCostPaymentForm(serviceId, rawMonth);
  return (
    <FormModal
      title={title}
      description={description}
      pageHref={`/costs/payments/new?serviceId=${service.id}&month=${month}`}
    >
      <CostPaymentForm service={service} month={month} payment={payment} />
    </FormModal>
  );
}
