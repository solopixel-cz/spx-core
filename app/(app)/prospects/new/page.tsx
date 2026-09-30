import { requireAuth } from "@/lib/auth";
import { FormPage } from "@/components/form-page";
import { ProspectForm } from "@/components/prospects/prospect-form";

export default async function NewProspectPage() {
  await requireAuth();
  return (
    <FormPage
      backHref="/prospects"
      breadcrumbs={[{ label: "Oslovení", href: "/prospects" }, { label: "Přidat kontakt" }]}
      title="Přidat kontakt"
    >
      <ProspectForm backHref="/prospects" />
    </FormPage>
  );
}
