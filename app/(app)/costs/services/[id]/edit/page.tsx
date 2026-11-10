import { loadCostServiceForm } from "@/lib/cost-routes";
import { FormPage } from "@/components/form-page";
import { CostServiceForm } from "@/components/costs/cost-service-form";

export default async function EditCostServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await loadCostServiceForm(id);

  return (
    <FormPage
      backHref="/costs"
      breadcrumbs={[{ label: "Náklady", href: "/costs" }, { label: service.name }]}
      title="Upravit službu"
    >
      <CostServiceForm service={service} />
    </FormPage>
  );
}
