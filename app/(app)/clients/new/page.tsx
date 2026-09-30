import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FormPage } from "@/components/form-page";
import { ClientForm } from "@/components/clients/client-form";

/**
 * Nový klient. S `?prospectId=` jde o převod z Oslovení: formulář se předvyplní
 * z kontaktu a server ho po uložení označí jako převedený.
 */
export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ prospectId?: string }>;
}) {
  const user = await requireAuth();
  const { prospectId } = await searchParams;

  if (!prospectId) {
    return (
      <FormPage
        backHref="/clients"
        breadcrumbs={[{ label: "Klienti", href: "/clients" }, { label: "Nový klient" }]}
        title="Nový klient"
      >
        <ClientForm cancelHref="/clients" />
      </FormPage>
    );
  }

  const db = getAdminFirestore();
  const doc = await db.collection("prospects").doc(prospectId).get();
  if (!doc.exists || doc.data()?.deletedAt) notFound();
  const p = doc.data()!;
  if (user.role === "sales" && p.ownerUid !== user.uid) notFound();

  const prospectHref = `/prospects/${prospectId}`;
  const portalUrl = (p.portalUrl as string | undefined) ?? null;

  return (
    <FormPage
      backHref={prospectHref}
      breadcrumbs={[
        { label: "Oslovení", href: "/prospects" },
        { label: p.name as string, href: prospectHref },
        { label: "Vytvořit klienta" },
      ]}
      title="Vytvořit klienta z Oslovení"
      description="Údaje jsou předvyplněné z kontaktu. Kontakt se po uložení označí jako klient."
    >
      <ClientForm
        cancelHref={prospectHref}
        prospectId={prospectId}
        defaultValues={{
          kind: "person",
          name: p.name as string,
          company: (p.company as string | undefined) ?? "",
          email: (p.email as string | undefined) ?? "",
          phone: (p.phone as string | undefined) ?? "",
          billingCity: (p.city as string | undefined) ?? "",
          status: "onboarding",
          notes: portalUrl ? `Z Oslovení. Profil: ${portalUrl}` : "Z Oslovení.",
        }}
      />
    </FormPage>
  );
}
