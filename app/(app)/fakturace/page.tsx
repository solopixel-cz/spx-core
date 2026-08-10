import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { InvoicesPageClient } from "@/components/invoices/invoices-page-client";

export default async function FakturacePage() {
  await requireRole("admin", "member");
  const db = getAdminFirestore();

  const [invoicesSnap, clientsSnap, invoiceEmailsSnap] = await Promise.all([
    db.collection("invoices").orderBy("issuedAt", "desc").get(),
    db.collection("clients").get(),
    db.collection("invoiceEmails").get(),
  ]);

  const clientMap: Record<string, string> = {};
  clientsSnap.docs.forEach((doc) => {
    clientMap[doc.id] = doc.data().name;
  });

  // Poslední e-mail stav per faktura (nejnovější dle sentAt).
  const emailStatusMap: Record<string, string> = {};
  const emailSentAtMap: Record<string, number> = {};
  invoiceEmailsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const invoiceId = data.invoiceId as string;
    const sentMs = data.sentAt?.toMillis?.() ?? 0;
    if (sentMs >= (emailSentAtMap[invoiceId] ?? -1)) {
      emailSentAtMap[invoiceId] = sentMs;
      emailStatusMap[invoiceId] = data.status as string;
    }
  });

  const now = new Date();
  const invoices = invoicesSnap.docs.map((doc) => {
    const data = doc.data();
    const dueAt = data.dueAt?.toDate?.() ?? null;
    let status = data.status as string;
    if (status === "sent" && dueAt && dueAt < now) {
      status = "overdue";
    }
    return {
      id: doc.id,
      clientId: data.clientId as string,
      clientName: clientMap[data.clientId] ?? "—",
      number: data.number as string,
      amount: data.amount as number,
      issuedAt: data.issuedAt?.toDate?.()?.toISOString() ?? null,
      dueAt: dueAt?.toISOString() ?? null,
      paidAt: data.paidAt?.toDate?.()?.toISOString() ?? null,
      status,
      emailStatus: emailStatusMap[doc.id] ?? null,
    };
  });

  // Stats
  const overdue = invoices.filter((i) => i.status === "overdue");
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const issuedThisMonth = invoices.filter((i) => {
    if (!i.issuedAt) return false;
    const d = new Date(i.issuedAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const paidThisMonth = invoices.filter((i) => {
    if (!i.paidAt) return false;
    const d = new Date(i.paidAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const stats = {
    overdueCount: overdue.length,
    overdueSum: overdue.reduce((s, i) => s + i.amount, 0),
    issuedThisMonthSum: issuedThisMonth.reduce((s, i) => s + i.amount, 0),
    paidThisMonthSum: paidThisMonth.reduce((s, i) => s + i.amount, 0),
  };

  return <InvoicesPageClient invoices={invoices} stats={stats} />;
}
