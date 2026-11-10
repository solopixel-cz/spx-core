import { requireRole } from "@/lib/auth";
import { NEW_COST_SERVICE_DESCRIPTION } from "@/lib/cost-routes";
import { FormModal } from "@/components/form-modal";
import { CostServiceForm } from "@/components/costs/cost-service-form";

/** Nová služba jako modál nad Náklady; napřímo `/costs/services/new` je stránka. */
export default async function NewCostServiceModal() {
  await requireRole("admin", "member");
  return (
    <FormModal title="Nová služba" description={NEW_COST_SERVICE_DESCRIPTION} pageHref="/costs/services/new">
      <CostServiceForm />
    </FormModal>
  );
}
