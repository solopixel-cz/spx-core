import { redirect } from "next/navigation";
import { loadClientForRoute } from "@/lib/client-route";
import { FormPage } from "@/components/form-page";
import { DomainForm } from "@/components/clients/domain-form";

export default async function NewDomainPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, backHref, crumbs } = await loadClientForRoute(id, "domeny");
  if (data.deletedAt) redirect(backHref);

  return (
    <FormPage backHref={backHref} breadcrumbs={crumbs("Nová doména")} title="Nová doména">
      <DomainForm clientId={id} backHref={backHref} />
    </FormPage>
  );
}
