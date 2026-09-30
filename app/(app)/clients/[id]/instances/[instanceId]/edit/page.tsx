import { notFound } from "next/navigation";
import { loadClientForRoute } from "@/lib/client-route";
import { FormPage } from "@/components/form-page";
import { InstanceForm } from "@/components/clients/instance-form";

export default async function EditInstancePage({
  params,
}: {
  params: Promise<{ id: string; instanceId: string }>;
}) {
  const { id, instanceId } = await params;
  const { db, backHref, crumbs } = await loadClientForRoute(id, "instance");

  const doc = await db.collection("instances").doc(instanceId).get();
  const d = doc.data();
  if (!d || d.clientId !== id || d.deletedAt) notFound();

  return (
    <FormPage
      backHref={backHref}
      breadcrumbs={crumbs(d.domain as string)}
      title={d.type === "web" ? "Upravit web" : "Upravit vizitku"}
    >
      <InstanceForm
        clientId={id}
        backHref={backHref}
        instance={{
          id: doc.id,
          type: (d.type as string | undefined) ?? "card",
          advisorSlug: (d.advisorSlug as string | undefined) ?? "",
          hosting: d.hosting as string | undefined,
          domain: d.domain as string,
          status: d.status as string,
          repoUrl: d.repoUrl as string | undefined,
          deployUrl: d.deployUrl as string | undefined,
          features: (d.features ?? []) as string[],
          notes: d.notes as string | undefined,
        }}
      />
    </FormPage>
  );
}
