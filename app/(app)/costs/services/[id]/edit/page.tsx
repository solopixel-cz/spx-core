import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { serviceFromDoc } from "@/lib/cost-store";
import { FormPage } from "@/components/form-page";
import { CostServiceForm } from "@/components/costs/cost-service-form";

export default async function EditCostServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin", "member");
  const { id } = await params;
  const doc = await getAdminFirestore().collection("costServices").doc(id).get();
  if (!doc.exists) notFound();
  const service = serviceFromDoc(doc);

  return (
    <FormPage
      backHref="/costs"
      breadcrumbs={[{ label: "Náklady", href: "/costs" }, { label: service.name }]}
      title="Upravit službu"
    >
      <CostServiceForm service={service} />
    </FormPage>
  );
}
