import { requireRole } from "@/lib/auth";
import { FormPage } from "@/components/form-page";
import { CostServiceForm } from "@/components/costs/cost-service-form";
import { NEW_COST_SERVICE_DESCRIPTION } from "@/lib/cost-routes";

export default async function NewCostServicePage() {
  await requireRole("admin", "member");
  return (
    <FormPage
      backHref="/costs"
      breadcrumbs={[{ label: "Náklady", href: "/costs" }, { label: "Nová služba" }]}
      title="Nová služba"
      description={NEW_COST_SERVICE_DESCRIPTION}
    >
      <CostServiceForm />
    </FormPage>
  );
}
