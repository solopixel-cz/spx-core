import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { clientOptions, domainFromDoc } from "@/lib/domains";
import { FormPage } from "@/components/form-page";
import { DomainForm } from "@/components/clients/domain-form";

export default async function EditDomainPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin", "member");
  const { id } = await params;
  const db = getAdminFirestore();
  const [doc, clients] = await Promise.all([
    db.collection("domains").doc(id).get(),
    clientOptions(db),
  ]);
  if (!doc.exists) notFound();
  const domain = domainFromDoc(doc);

  return (
    <FormPage
      backHref="/domains"
      breadcrumbs={[{ label: "Domény", href: "/domains" }, { label: domain.name }]}
      title="Upravit doménu"
    >
      <DomainForm clientId={domain.clientId} domain={domain} clients={clients} backHref="/domains" />
    </FormPage>
  );
}
