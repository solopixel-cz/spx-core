import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  if (data.status !== "draft") redirect(`/fakturace/${id}`);

  const clientsSnap = await db.collection("clients").get();
  const clients = clientsSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((d) => ({ id: d.id, name: d.data().name as string }));

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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href={`/fakturace/${id}`} />}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">Upravit fakturu</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <InvoiceForm clients={clients} invoice={invoice} />
        </CardContent>
      </Card>
    </div>
  );
}
