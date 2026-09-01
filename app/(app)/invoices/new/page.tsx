import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export default async function NovaFakturaPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; sub?: string }>;
}) {
  await requireRole("admin");
  const { clientId, sub } = await searchParams;
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
  if (clientId && sub) {
    const subSnap = await db
      .collection("subscriptions")
      .where("clientId", "==", clientId)
      .limit(1)
      .get();
    if (!subSnap.empty) {
      const s = subSnap.docs[0].data();
      const monthly = (s.priceMonthly as number) ?? 0;
      const unit = s.billingCycle === "yearly" ? monthly * 12 : monthly;
      const cycle = s.billingCycle === "yearly" ? "roční" : "měsíční";
      defaultItems = [
        {
          description: `Předplatné ${s.plan} (${cycle}) {obdobi}`,
          quantity: 1,
          unitPrice: unit,
          // Sleva z předplatného se přenáší jako sleva řádku (plná cena − %),
          // aby byla na dokladu vidět transparentně.
          discountPercent: (s.discountPercent as number) ?? 0,
        },
      ];
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/invoices" />}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">Nová faktura</h1>
      </div>
      <InvoiceForm clients={clients} defaultClientId={clientId} defaultItems={defaultItems} />
    </div>
  );
}
