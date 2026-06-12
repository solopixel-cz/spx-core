import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getAttentionItems } from "@/lib/attention";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const user = await requireAuth();
  const db = getAdminFirestore();
  const isSales = user.role === "sales";

  const [
    attentionItems,
    leadsSnap,
    invoicesSnap,
    subsSnap,
    tasksSnap,
    activitySnap,
    clientsSnap,
    usersSnap,
    prospectsSnap,
  ] = await Promise.all([
    getAttentionItems(user.uid, user.role),
    db.collection("leads").get(),
    isSales ? Promise.resolve(null) : db.collection("invoices").get(),
    isSales ? Promise.resolve(null) : db.collection("subscriptions").where("status", "==", "active").get(),
    db.collection("tasks").get(),
    db.collection("activity").orderBy("createdAt", "desc").limit(10).get(),
    db.collection("clients").get(),
    db.collection("users").get(),
    db.collection("prospects").get(),
  ]);

  // Lead funnel
  const leadsByStage: Record<string, number> = {};
  let pipelineValue = 0;
  const activeLeadStages = ["new", "contacted", "demo", "offer", "contract", "onboarding"];
  leadsSnap.docs.forEach((doc) => {
    const d = doc.data();
    const stage = d.stage as string;
    leadsByStage[stage] = (leadsByStage[stage] || 0) + 1;
    if (activeLeadStages.includes(stage) && d.value) {
      pipelineValue += d.value as number;
    }
  });

  // Financial metrics (admin/member only)
  let mrr = 0;
  let paidThisMonth = 0;
  let invoicedThisMonth = 0;
  const monthlyPaidData: { month: string; amount: number }[] = [];

  if (!isSales && invoicesSnap && subsSnap) {
    subsSnap.docs.forEach((doc) => {
      const d = doc.data();
      const price = d.priceMonthly as number;
      const cycle = d.billingCycle as string;
      const discount = (d.discountPercent as number) || 0;
      const effective = price * (1 - discount / 100);
      mrr += cycle === "yearly" ? effective / 12 : effective;
    });
    mrr = Math.round(mrr);

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const monthBuckets: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthBuckets[key] = 0;
    }

    invoicesSnap.docs.forEach((doc) => {
      const d = doc.data();
      const amount = d.amount as number;
      const issuedAt = d.issuedAt?.toDate?.();
      const paidAt = d.paidAt?.toDate?.();

      if (issuedAt && issuedAt.getMonth() === thisMonth && issuedAt.getFullYear() === thisYear) {
        invoicedThisMonth += amount;
      }
      if (paidAt) {
        if (paidAt.getMonth() === thisMonth && paidAt.getFullYear() === thisYear) {
          paidThisMonth += amount;
        }
        const key = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, "0")}`;
        if (key in monthBuckets) {
          monthBuckets[key] += amount;
        }
      }
    });

    for (const [month, amount] of Object.entries(monthBuckets)) {
      monthlyPaidData.push({ month, amount });
    }
  }

  // Onboarding clients
  const onboardingClients = clientsSnap.docs
    .filter((doc) => doc.data().status === "onboarding")
    .map((doc) => {
      const d = doc.data();
      const clientTasks = tasksSnap.docs.filter(
        (t) => t.data().clientId === doc.id && t.data().checklistTemplateId
      );
      const done = clientTasks.filter((t) => t.data().status === "done").length;
      const total = clientTasks.length;
      const createdAt = d.createdAt?.toDate?.();
      const serverNow = new Date();
      const daysIn = createdAt ? Math.floor((serverNow.getTime() - createdAt.getTime()) / 86400000) : 0;
      const lastDone = clientTasks
        .filter((t) => t.data().status === "done")
        .map((t) => t.data().updatedAt?.toDate?.()?.getTime() ?? 0)
        .sort((a: number, b: number) => b - a)[0];
      const stale = lastDone
        ? serverNow.getTime() - lastDone > 7 * 86400000
        : total > 0 && daysIn > 7;

      return { id: doc.id, name: d.name as string, daysIn, done, total, stale: !!stale };
    });

  // User name map
  const userMap: Record<string, string> = {};
  usersSnap.docs.forEach((doc) => {
    userMap[doc.id] = doc.data().displayName as string;
  });

  // Recent activity
  const recentActivity = activitySnap.docs
    .filter((doc) => {
      if (isSales) return (doc.data().entityType as string) !== "invoice";
      return true;
    })
    .slice(0, 10)
    .map((doc) => {
      const d = doc.data();
      const et = d.entityType as string;
      const href = et === "client" ? `/klienti/${d.entityId}` : et === "lead" ? "/leady" : et === "ticket" ? "/tickety" : et === "prospect" ? "/prospekti" : "/fakturace";
      return {
        id: doc.id,
        actor: userMap[d.actorUid as string] ?? "Systém",
        text: d.text as string,
        href,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

  // Prospect outreach stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const prospectStats = { contactedThisWeek: 0, responding: 0, converted: 0 };
  const prospectsByOwner: Record<string, { claimed: number; contacted: number; responding: number; converted: number }> = {};

  prospectsSnap.docs.forEach((doc) => {
    const d = doc.data();
    const ownerId = d.ownerUid as string | null;

    if (ownerId) {
      if (!prospectsByOwner[ownerId]) {
        prospectsByOwner[ownerId] = { claimed: 0, contacted: 0, responding: 0, converted: 0 };
      }
      prospectsByOwner[ownerId].claimed++;
    }

    const lastTouch = d.lastTouchAt?.toDate?.();
    if (lastTouch && lastTouch >= weekAgo) {
      prospectStats.contactedThisWeek++;
      if (ownerId && prospectsByOwner[ownerId]) {
        prospectsByOwner[ownerId].contacted++;
      }
    }
    if (d.status === "responding") {
      prospectStats.responding++;
      if (ownerId && prospectsByOwner[ownerId]) {
        prospectsByOwner[ownerId].responding++;
      }
    }
    if (d.status === "converted") {
      prospectStats.converted++;
      if (ownerId && prospectsByOwner[ownerId]) {
        prospectsByOwner[ownerId].converted++;
      }
    }
  });

  const prospectOwnerStats = Object.entries(prospectsByOwner).map(([uid, stats]) => ({
    uid,
    name: userMap[uid] ?? uid,
    ...stats,
  }));

  const myOpenTasks = tasksSnap.docs.filter(
    (t) => t.data().assigneeUid === user.uid && t.data().status === "open"
  ).length;

  return (
    <DashboardClient
      attentionItems={attentionItems}
      leadsByStage={leadsByStage}
      pipelineValue={pipelineValue}
      mrr={mrr}
      paidThisMonth={paidThisMonth}
      invoicedThisMonth={invoicedThisMonth}
      monthlyPaidData={monthlyPaidData}
      onboardingClients={onboardingClients}
      recentActivity={recentActivity}
      myOpenTasks={myOpenTasks}
      prospectStats={prospectStats}
      prospectOwnerStats={prospectOwnerStats}
      userRole={user.role}
    />
  );
}
