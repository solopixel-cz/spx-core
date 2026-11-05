import { requireRole } from "@/lib/auth";
import { FormPage } from "@/components/form-page";
import { CostServiceForm } from "@/components/costs/cost-service-form";

export default async function NewCostServicePage() {
  await requireRole("admin", "member");
  return (
    <FormPage
      backHref="/costs"
      breadcrumbs={[{ label: "Náklady", href: "/costs" }, { label: "Nová služba" }]}
      title="Nová služba"
      description="Co platíme za provoz: hosting, cloud, AI, nástroje. Domény se zadávají ve správě domén."
    >
      <CostServiceForm />
    </FormPage>
  );
}
