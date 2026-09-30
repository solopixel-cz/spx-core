import { redirect } from "next/navigation";
import { loadClientForRoute } from "@/lib/client-route";
import { FormPage } from "@/components/form-page";
import { ProjectForm } from "@/components/clients/project-form";

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, backHref, crumbs } = await loadClientForRoute(id, "instance");
  if (data.deletedAt) redirect(backHref);

  return (
    <FormPage
      backHref={backHref}
      breadcrumbs={crumbs("Nová zakázka")}
      title="Nová zakázka"
      description="Jednorázová služba, např. marketingový prospekt nebo úprava webu."
    >
      <ProjectForm clientId={id} backHref={backHref} />
    </FormPage>
  );
}
