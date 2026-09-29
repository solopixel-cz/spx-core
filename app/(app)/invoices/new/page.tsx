import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { subscriptionLabel } from "@/lib/plans";

export default async function NovaFakturaPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; sub?: string; project?: string }>;
}) {
  await requireRole("admin", "member");
  const { clientId, sub, project } = await searchParams;
  const db = getAdminFirestore();

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

  // Předvyplnění položek z předplatného klienta (tlačítko „Z předplatného").
  let defaultItems:
    | { description: string; quantity: number; unitPrice: number; discountPercent?: number }[]
    | undefined;
  let subscriptionId: string | undefined;
  if (clientId && sub) {
    // `sub` = ID předplatného (klient jich může mít víc); stará URL `sub=1` → první předplatné.
    const byId = sub !== "1" ? await db.collection("subscriptions").doc(sub).get() : null;
    const subDoc =
      byId?.exists && byId.data()?.clientId === clientId
        ? byId
        : (await db.collection("subscriptions").where("clientId", "==", clientId).limit(1).get()).docs[0];
    if (subDoc) {
      subscriptionId = subDoc.id;
      const s = subDoc.data()!;
      const monthly = (s.priceMonthly as number) ?? 0;
      const unit = s.billingCycle === "yearly" ? monthly * 12 : monthly;
      const cycle = s.billingCycle === "yearly" ? "roční" : "měsíční";
      defaultItems = [
        {
          description: `${subscriptionLabel(s)} (${cycle}) {obdobi}`,
          quantity: 1,
          unitPrice: unit,
          // Sleva z předplatného se přenáší jako sleva řádku (plná cena − %),
          // aby byla na dokladu vidět transparentně.
          discountPercent: (s.discountPercent as number) ?? 0,
        },
      ];
    }
  }

  // Předvyplnění ze zakázky (tlačítko „Vyfakturovat" v detailu klienta).
  let projectId: string | undefined;
  if (clientId && project) {
    const projectDoc = await db.collection("projects").doc(project).get();
    const p = projectDoc.data();
    if (projectDoc.exists && p?.clientId === clientId && !p.invoiceId && !p.deletedAt) {
      projectId = projectDoc.id;
      defaultItems = [
        {
          description: p.title as string,
          quantity: 1,
          unitPrice: (p.price as number | null) ?? 0,
          discountPercent: 0,
        },
      ];
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        backHref="/invoices"
        items={[{ label: "Faktury", href: "/invoices" }, { label: "Nová faktura" }]}
      />
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">Nová faktura</h1>
      </div>
      <InvoiceForm
        clients={clients}
        defaultClientId={clientId}
        defaultItems={defaultItems}
        projectId={projectId}
        subscriptionId={subscriptionId}
      />
    </div>
  );
}
