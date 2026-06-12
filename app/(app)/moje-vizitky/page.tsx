import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { redirect } from "next/navigation";
import { MojeVizitkyClient } from "@/components/commissions/moje-vizitky-client";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export default async function MojeVizitkyPage() {
  const user = await requireAuth();
  if (user.role !== "sales") redirect("/");

  const db = getAdminFirestore();

  // Get user's commission rate
  const userDoc = await db.collection("users").doc(user.uid).get();
  const userRate = userDoc.data()?.commissionRate as number | undefined;
  let defaultRate = 0.2;
  const settingsDoc = await db.collection("settings").doc("commission").get();
  if (settingsDoc.exists) {
    defaultRate = (settingsDoc.data()?.defaultRate as number) ?? 0.2;
  }
  const effectiveRate = userRate ?? defaultRate;

  const [clientsSnap, commissionsSnap, subsSnap, instancesSnap] = await Promise.all([
    db.collection("clients").where("salesOwnerUid", "==", user.uid).get(),
    db.collection("commissions").where("salesUid", "==", user.uid).get(),
    db.collection("subscriptions").get(),
    db.collection("instances").get(),
  ]);

  // Build client rows with subscription info
  const clients = clientsSnap.docs.map((doc) => {
    const d = doc.data();
    const sub = subsSnap.docs.find((s) => s.data().clientId === doc.id);
    const inst = instancesSnap.docs.find((i) => i.data().clientId === doc.id);
    const priceMonthly = sub ? (sub.data().priceMonthly as number) : 0;
    const discount = sub ? ((sub.data().discountPercent as number) || 0) : 0;
    const effective = priceMonthly * (1 - discount / 100);

    return {
      id: doc.id,
      name: d.name as string,
      status: d.status as string,
      instanceStatus: inst ? (inst.data().status as string) : null,
      plan: sub ? (sub.data().plan as string) : null,
      priceMonthly: Math.round(effective),
      myCommission: Math.round(effective * effectiveRate),
    };
  });

  // Commission rows (only for this user's clients)
  const commissions = commissionsSnap.docs.map((doc) => {
    const d = doc.data();
    const clientDoc = clientsSnap.docs.find((c) => c.id === d.clientId);
    return {
      id: doc.id,
      clientName: clientDoc ? (clientDoc.data().name as string) : "—",
      amount: d.amount as number,
      status: d.status as string,
      earnedAt: serializeTimestamp(d.earnedAt),
      paidAt: serializeTimestamp(d.paidAt),
    };
  });

  // Summary
  const pendingTotal = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + c.amount, 0);

  const thisYear = new Date().getFullYear();
  const paidThisYear = commissions
    .filter((c) => c.status === "paid" && c.paidAt && new Date(c.paidAt).getFullYear() === thisYear)
    .reduce((sum, c) => sum + c.amount, 0);

  const monthlyCommission = clients
    .filter((c) => c.status === "active" || c.status === "onboarding")
    .reduce((sum, c) => sum + c.myCommission, 0);

  return (
    <MojeVizitkyClient
      clients={clients}
      commissions={commissions}
      pendingTotal={pendingTotal}
      paidThisYear={paidThisYear}
      monthlyCommission={monthlyCommission}
      rate={effectiveRate}
    />
  );
}
