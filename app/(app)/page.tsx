import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getAttentionItems } from "@/lib/attention";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const user = await requireAuth();
  const db = getAdminFirestore();
  const isSales = user.role === "sales";

  const startNow = new Date();
  const engagementSince = new Date(startNow.getTime() - 8 * 86400000);

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
    engagementSnap,
  ] = await Promise.all([
    getAttentionItems(user.uid, user.role),
    db.collection("leads").get(),
    isSales ? Promise.resolve(null) : db.collection("invoices").get(),
    isSales ? Promise.resolve(null) : db.collection("subscriptions").where("status", "==", "active").get(),
    db.collection("tasks").get(),
    db.collection("activity").orderBy("createdAt", "desc").limit(6).get(),
    db.collection("clients").get(),
    db.collection("users").get(),
    db.collection("prospects").get(),
    // Engagement events (otevření / kliknutí) za posledních 8 dní pro denní rozpad
    db.collection("activity").where("createdAt", ">=", engagementSince).get(),
  ]);

  // Lead funnel
  const leadsByStage: Record<string, number> = {};
  let pipelineValue = 0;
  const activeLeadStages = ["new", "contacted", "demo", "offer", "contract", "onboarding"];
  leadsSnap.docs.filter((d) => !d.data().deletedAt).forEach((doc) => {
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
  const overdueInvoices = { count: 0, sum: 0 };
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
      if (d.status === "overdue") {
        overdueInvoices.count++;
        overdueInvoices.sum += amount;
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

  // Onboarding clients (sales sees only own)
  const onboardingClients = clientsSnap.docs
    .filter((doc) => {
      if (doc.data().deletedAt) return false;
      if (doc.data().status !== "onboarding") return false;
      if (isSales && doc.data().salesOwnerUid !== user.uid) return false;
      return true;
    })
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

  // Build sales owned client IDs
  const salesClientIds = isSales
    ? new Set(clientsSnap.docs.filter((d) => !d.data().deletedAt && d.data().salesOwnerUid === user.uid).map((d) => d.id))
    : null;

  // Recent activity (sales: filter client/ticket to own)
  const recentActivity = activitySnap.docs
    .filter((doc) => {
      if (isSales) {
        const et = doc.data().entityType as string;
        if (et === "invoice") return false;
        if ((et === "client" || et === "ticket") && salesClientIds) {
          return salesClientIds.has(doc.data().entityId as string);
        }
      }
      return true;
    })
    .slice(0, 6)
    .map((doc) => {
      const d = doc.data();
      const et = d.entityType as string;
      const href = et === "client" ? `/klienti/${d.entityId}` : et === "lead" ? "/leady" : et === "ticket" ? "/tickety" : et === "prospect" ? "/prospekti" : "/fakturace";
      return {
        id: doc.id,
        actorUid: d.actorUid as string,
        actor: userMap[d.actorUid as string] ?? "Systém",
        text: d.text as string,
        href,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

  // Dnešní follow-upy — prospekti s termínem follow-upu ≤ dnes (a po termínu).
  // Sales vidí jen vlastní. Terminální stavy se ignorují.
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const terminalProspectStatuses = ["converted", "not_interested", "unreachable"];
  const followUps = prospectsSnap.docs
    .filter((doc) => {
      const d = doc.data();
      if (d.deletedAt) return false;
      if (terminalProspectStatuses.includes(d.status as string)) return false;
      if (isSales && d.ownerUid !== user.uid) return false;
      const due = d.nextFollowUpAt?.toDate?.();
      return due && due <= endOfToday;
    })
    .map((doc) => {
      const d = doc.data();
      const due = d.nextFollowUpAt.toDate() as Date;
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      return {
        id: doc.id,
        name: d.name as string,
        company: (d.company as string) ?? null,
        nextFollowUpAt: due.toISOString(),
        overdue: due < startOfToday,
      };
    })
    .sort((a, b) => a.nextFollowUpAt.localeCompare(b.nextFollowUpAt));

  // Engagement: denní rozpad otevření a kliknutí za posledních 7 dní (v české zóně)
  const PRAGUE_TZ = "Europe/Prague";
  const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: PRAGUE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dayLabelFmt = new Intl.DateTimeFormat("cs-CZ", {
    timeZone: PRAGUE_TZ,
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });

  // Posledních 7 dní (nejstarší → nejnovější), ukotveno na pražské poledne kvůli DST
  const todayKey = dayKeyFmt.format(startNow);
  const anchor = new Date(`${todayKey}T12:00:00Z`);
  const engagementDaily = [] as {
    day: string;
    label: string;
    opened: number;
    clicked: number;
  }[];
  const dayIndex: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchor.getTime() - i * 86400000);
    const key = dayKeyFmt.format(d);
    dayIndex[key] = engagementDaily.length;
    engagementDaily.push({ day: key, label: dayLabelFmt.format(d), opened: 0, clicked: 0 });
  }

  engagementSnap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.kind !== "system") return;
    const text = d.text as string;
    const isOpen = text === "Otevřel e-mail";
    const isClick = text === "Kliknul na demo ✨";
    if (!isOpen && !isClick) return;
    // Sales vidí jen vlastní oslovení (actorUid = senderUid e-mailu)
    if (isSales && d.actorUid !== user.uid) return;
    const created = d.createdAt?.toDate?.();
    if (!created) return;
    const key = dayKeyFmt.format(created);
    const idx = dayIndex[key];
    if (idx === undefined) return;
    if (isOpen) engagementDaily[idx].opened++;
    else engagementDaily[idx].clicked++;
  });

  const engagementToday = engagementDaily[engagementDaily.length - 1] ?? {
    opened: 0,
    clicked: 0,
  };

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
      overdueInvoices={overdueInvoices}
      followUps={followUps}
      engagementDaily={engagementDaily}
      engagementToday={{ opened: engagementToday.opened, clicked: engagementToday.clicked }}
      userRole={user.role}
    />
  );
}
