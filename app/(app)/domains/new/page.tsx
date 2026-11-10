import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { clientOptions } from "@/lib/domains";
import { FormPage } from "@/components/form-page";
import { DomainForm } from "@/components/clients/domain-form";

export default async function NewDomainPage() {
  await requireRole("admin", "member");
  const clients = await clientOptions(getAdminFirestore());

  return (
    <FormPage
      backHref="/domains"
      breadcrumbs={[{ label: "Domény", href: "/domains" }, { label: "Nová doména" }]}
      title="Nová doména"
    >
      <DomainForm clientId={null} clients={clients} backHref="/domains" />
    </FormPage>
  );
}
