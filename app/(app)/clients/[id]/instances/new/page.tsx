import { redirect } from "next/navigation";
import { loadClientForRoute } from "@/lib/client-route";
import { FormPage } from "@/components/form-page";
import { InstanceForm } from "@/components/clients/instance-form";

export default async function NewInstancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, backHref, crumbs } = await loadClientForRoute(id, "instance");
  if (data.deletedAt) redirect(backHref);

  return (
    <FormPage backHref={backHref} breadcrumbs={crumbs("Nová vizitka / web")} title="Nová vizitka / web">
      <InstanceForm clientId={id} backHref={backHref} />
    </FormPage>
  );
}
