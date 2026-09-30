import { notFound, redirect } from "next/navigation";
import { loadClientForRoute } from "@/lib/client-route";
import { FormPage } from "@/components/form-page";
import { ProjectForm } from "@/components/clients/project-form";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id, projectId } = await params;
  const { db, data, backHref, crumbs } = await loadClientForRoute(id, "instance");
  if (data.deletedAt) redirect(backHref);

  const doc = await db.collection("projects").doc(projectId).get();
  const p = doc.data();
  if (!p || p.clientId !== id || p.deletedAt) notFound();

  return (
    <FormPage backHref={backHref} breadcrumbs={crumbs(p.title as string)} title="Upravit zakázku">
      <ProjectForm
        clientId={id}
        backHref={backHref}
        project={{
          id: doc.id,
          title: p.title as string,
          description: (p.description as string | null) ?? null,
          status: p.status as string,
          price: (p.price as number | null) ?? null,
          invoiceId: (p.invoiceId as string | undefined) ?? null,
          invoiceNumber: null,
          dueAt: p.dueAt?.toDate?.()?.toISOString() ?? null,
          deliveredAt: p.deliveredAt?.toDate?.()?.toISOString() ?? null,
          createdAt: p.createdAt?.toDate?.()?.toISOString() ?? null,
        }}
      />
    </FormPage>
  );
}
