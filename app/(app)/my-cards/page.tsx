import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { redirect } from "next/navigation";
import { MojeVizitkyClient } from "@/components/my-cards/moje-vizitky-client";
import { subscriptionLabel } from "@/lib/plans";

export default async function MojeVizitkyPage() {
  const user = await requireAuth();
  if (user.role !== "sales") redirect("/");

  const db = getAdminFirestore();

  const [clientsSnap, subsSnap, instancesSnap] = await Promise.all([
    db.collection("clients").where("salesOwnerUid", "==", user.uid).get(),
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
    };
  });

  return <MojeVizitkyClient clients={clients} />;
}
