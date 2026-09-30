import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FormPage } from "@/components/form-page";
import { ProspectForm } from "@/components/prospects/prospect-form";

export default async function EditProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const db = getAdminFirestore();

  const doc = await db.collection("prospects").doc(id).get();
  const p = doc.data();
  if (!p || p.deletedAt) notFound();
  const detailHref = `/prospects/${id}`;
  // Upravovat smí vlastník kontaktu nebo admin/member (stejně jako na detailu).
  if (user.role === "sales" && p.ownerUid !== user.uid) redirect(detailHref);

  return (
    <FormPage
      backHref={detailHref}
      breadcrumbs={[
        { label: "Oslovení", href: "/prospects" },
        { label: p.name as string, href: detailHref },
        { label: "Upravit" },
      ]}
      title="Upravit kontakt"
    >
      <ProspectForm
        backHref={detailHref}
        prospect={{
          id,
          name: p.name as string,
          company: (p.company as string | undefined) ?? null,
          email: (p.email as string | undefined) ?? null,
          phone: (p.phone as string | undefined) ?? null,
          city: (p.city as string | undefined) ?? null,
          category: (p.category as string | undefined) ?? null,
          portalUrl: (p.portalUrl as string | undefined) ?? null,
          demoUrl: (p.demoUrl as string | undefined) ?? null,
        }}
      />
    </FormPage>
  );
}
