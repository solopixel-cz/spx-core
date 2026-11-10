import { loadCostServiceForm } from "@/lib/cost-routes";
import { FormModal } from "@/components/form-modal";
import { CostServiceForm } from "@/components/costs/cost-service-form";

/** Úprava služby jako modál nad Náklady; napřímo je to stránka. */
export default async function EditCostServiceModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await loadCostServiceForm(id);
  return (
    <FormModal title="Upravit službu" description={service.name} pageHref={`/costs/services/${id}/edit`}>
      <CostServiceForm service={service} />
    </FormModal>
  );
}
