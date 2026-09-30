import { notFound, redirect } from "next/navigation";
import { loadClientForRoute } from "@/lib/client-route";
import { FormPage } from "@/components/form-page";
import { DomainForm } from "@/components/clients/domain-form";

export default async function EditDomainPage({
  params,
}: {
  params: Promise<{ id: string; domainId: string }>;
}) {
  const { id, domainId } = await params;
  const { db, data, backHref, crumbs } = await loadClientForRoute(id, "domeny");
  if (data.deletedAt) redirect(backHref);

  const doc = await db.collection("domains").doc(domainId).get();
  const d = doc.data();
  if (!d || d.clientId !== id) notFound();

  return (
    <FormPage backHref={backHref} breadcrumbs={crumbs(d.name as string)} title="Upravit doménu">
      <DomainForm
        clientId={id}
        backHref={backHref}
        domain={{
          id: doc.id,
          clientId: id,
          name: d.name as string,
          registrar: (d.registrar as string | undefined) ?? null,
          account: (d.account as string | undefined) ?? null,
          hosting: (d.hosting as string | undefined) ?? null,
          purchasedAt: d.purchasedAt?.toDate?.()?.toISOString() ?? null,
          renewalAt: d.renewalAt?.toDate?.()?.toISOString() ?? null,
          autoRenew: (d.autoRenew as boolean | undefined) ?? false,
          note: (d.note as string | undefined) ?? null,
        }}
      />
    </FormPage>
  );
}
