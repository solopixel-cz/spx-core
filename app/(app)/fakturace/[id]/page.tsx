import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { InvoiceDetailClient } from "@/components/invoices/invoice-detail-client";

export default async function InvoiceDetailPage({
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

  const [clientSnap, emailsSnap, activitySnap] = await Promise.all([
    db.collection("clients").doc(data.clientId).get(),
    db.collection("invoiceEmails").where("invoiceId", "==", id).get(),
    db
      .collection("activity")
      .where("entityType", "==", "invoice")
      .where("entityId", "==", id)
      .orderBy("createdAt", "desc")
      .get(),
  ]);

  const now = new Date();
  const dueAt = data.dueAt?.toDate?.() ?? null;
  let status = data.status as string;
  if (status === "sent" && dueAt && dueAt < now) status = "overdue";

  const emails = emailsSnap.docs
    .map((d) => {
      const e = d.data();
      return {
        id: d.id,
        status: e.status as string,
        toEmail: e.toEmail as string,
        sentAt: e.sentAt?.toMillis?.() ?? 0,
        sentAtIso: e.sentAt?.toDate?.()?.toISOString() ?? null,
      };
    })
    .sort((a, b) => b.sentAt - a.sentAt);

  const activities = activitySnap.docs.map((d) => {
    const a = d.data();
    return {
      id: d.id,
      kind: a.kind as string,
      text: a.text as string,
      createdAt: a.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  const invoice = {
    id: doc.id,
    clientId: data.clientId as string,
    clientName: (clientSnap.data()?.name as string) ?? "—",
    clientEmail: (clientSnap.data()?.email as string) ?? null,
    number: data.number as string,
    amount: data.amount as number,
    items: (data.items as
      | { description: string; quantity: number; unitPrice: number }[]
      | undefined) ?? null,
    variableSymbol: (data.variableSymbol as string) ?? null,
    note: (data.note as string) ?? null,
    status,
    issuedAt: data.issuedAt?.toDate?.()?.toISOString() ?? null,
    dueAt: dueAt?.toISOString() ?? null,
    paidAt: data.paidAt?.toDate?.()?.toISOString() ?? null,
  };

  return (
    <InvoiceDetailClient
      invoice={invoice}
      emails={emails}
      activities={activities}
    />
  );
}
