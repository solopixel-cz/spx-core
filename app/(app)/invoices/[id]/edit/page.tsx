import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FormPage } from "@/components/form-page";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export default async function UpravitFakturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin", "member");
  const { id } = await params;
  const db = getAdminFirestore();

  const doc = await db.collection("invoices").doc(id).get();
  if (!doc.exists) notFound();
  const data = doc.data()!;
  // Upravovat lze jen koncept.
  if (data.status !== "draft") redirect(`/invoices/${id}`);

  const clientsSnap = await db.collection("clients").get();
  const clients = clientsSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((d) => {
      const c = d.data();
      return {
        id: d.id,
        name: c.name as string,
        company: (c.company as string) ?? null,
        ico: (c.ico as string) ?? null,
        dic: (c.dic as string) ?? null,
        email: (c.email as string) ?? null,
        billingStreet: (c.billingStreet as string) ?? null,
        billingZip: (c.billingZip as string) ?? null,
        billingCity: (c.billingCity as string) ?? null,
      };
    });

  const invoice = {
    id,
    clientId: data.clientId as string,
    items: (data.items as
      | { description: string; quantity: number; unitPrice: number; discountPercent?: number }[]
      | undefined) ?? undefined,
    dueAt: data.dueAt?.toDate?.()?.toISOString() ?? null,
    variableSymbol: (data.variableSymbol as string) ?? null,
    note: (data.note as string) ?? null,
  };

  return (
    <FormPage
      backHref={`/invoices/${id}`}
      title="Upravit fakturu"
      full
      breadcrumbs={[
          { label: "Faktury", href: "/invoices" },
          { label: (data.number as string) ?? "Faktura", href: `/invoices/${id}` },
          { label: "Upravit" },
        ]}
    >
      <InvoiceForm clients={clients} invoice={invoice} />
    </FormPage>
  );
}
