import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { redirect } from "next/navigation";
import { MojeVizitkyClient } from "@/components/commissions/moje-vizitky-client";
import { subscriptionLabel } from "@/lib/plans";

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
  const clients = clientsSnap.docs.filter((d) => !d.data().deletedAt).map((doc) => {
    const d = doc.data();
    // Všechna běžící neinterní předplatná klienta (fáze 34C): měsíční cena po slevě (priceMonthly je vždy měsíční).
    const subs = subsSnap.docs
      .map((s) => s.data())
      .filter((s) => s.clientId === doc.id && s.status !== "cancelled" && !s.internal);
    const inst = instancesSnap.docs.find((i) => i.data().clientId === doc.id && !i.data().deletedAt);
    const effective = subs.reduce((sum, s) => {
      return sum + ((s.priceMonthly as number) ?? 0) * (1 - ((s.discountPercent as number) || 0) / 100);
    }, 0);

    return {
      id: doc.id,
      name: d.name as string,
      status: d.status as string,
      instanceStatus: inst ? (inst.data().status as string) : null,
      plan: subs.length > 0 ? subs.map((s) => subscriptionLabel(s)).join(", ") : null,
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
