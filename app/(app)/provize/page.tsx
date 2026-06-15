import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { ProvizePageClient } from "@/components/commissions/provize-page-client";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export default async function ProvizePage() {
  const user = await requireRole("admin", "member");
  const db = getAdminFirestore();

  const [commissionsSnap, usersSnap, clientsSnap, invoicesSnap, settingsSnap] = await Promise.all([
    db.collection("commissions").get(),
    db.collection("users").get(),
    db.collection("clients").get(),
    db.collection("invoices").get(),
    user.role === "admin" ? db.collection("settings").doc("commission").get() : Promise.resolve(null),
  ]);

  const userMap: Record<string, { displayName: string; role: string; commissionRate?: number }> = {};
  usersSnap.docs.forEach((doc) => {
    const d = doc.data();
    userMap[doc.id] = {
      displayName: d.displayName as string,
      role: d.role as string,
      commissionRate: d.commissionRate as number | undefined,
    };
  });

  const clientMap: Record<string, string> = {};
  clientsSnap.docs.forEach((doc) => {
    clientMap[doc.id] = doc.data().name as string;
  });

  const invoiceMap: Record<string, string> = {};
  invoicesSnap.docs.forEach((doc) => {
    invoiceMap[doc.id] = doc.data().number as string;
  });

  const commissions = commissionsSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      invoiceId: d.invoiceId as string,
      clientId: d.clientId as string,
      clientName: clientMap[d.clientId as string] ?? "—",
      invoiceNumber: invoiceMap[d.invoiceId as string] ?? d.invoiceId,
      salesUid: d.salesUid as string,
      salesName: userMap[d.salesUid as string]?.displayName ?? "—",
      baseAmount: d.baseAmount as number,
      rate: d.rate as number,
      amount: d.amount as number,
      status: d.status as string,
      payoutNote: (d.payoutNote as string) ?? null,
      earnedAt: serializeTimestamp(d.earnedAt),
      paidAt: serializeTimestamp(d.paidAt),
    };
  });

  const salesUsers = Object.entries(userMap)
    .filter(([, u]) => u.role === "sales")
    .map(([id, u]) => ({
      id,
      displayName: u.displayName,
      commissionRate: u.commissionRate,
    }));

  const defaultRate = settingsSnap && settingsSnap.exists
    ? (settingsSnap.data()?.defaultRate as number | undefined) ?? 0.2
    : undefined;

  return (
    <ProvizePageClient
      commissions={commissions}
      salesUsers={salesUsers}
      isAdmin={user.role === "admin"}
      defaultRate={defaultRate}
    />
  );
}
