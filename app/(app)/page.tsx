import { computeMrr } from "@/lib/mrr";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { DashboardClient, type DashboardData } from "@/components/dashboard/dashboard-client";
import { costsInMonth, monthKey, planForMonth } from "@/lib/costs";
import { loadCostData } from "@/lib/cost-routes";
import { addDays, loadCalendarEvents, pragueDay, type CalendarEvent } from "@/lib/calendar";
import { normalizeSubmission, type RawSubmission } from "@/lib/submission-view-model";
import { greetingName } from "@/lib/vocative";

const TERMINAL_PROSPECT = ["converted", "not_interested", "unreachable"];
const DONE_TICKET = ["resolved", "closed"];
const SOON_DAYS = 30;

const toDate = (v: unknown): Date | undefined => (v as { toDate?: () => Date } | null | undefined)?.toDate?.();
const czDate = (d: Date) => d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", timeZone: "Europe/Prague" });

/**
 * Dashboard: pozdrav, co je dnes potřeba udělat (kalendář, follow-upy a co čeká
 * na odpověď) a přehled pro řízení (peníze, klienti, obchod, provoz). Obchodník
 * vidí jen své klienty a oslovení, bez peněz a provozu.
 */
export default async function DashboardPage() {
  const user = await requireAuth();
  const db = getAdminFirestore();
  const isSales = user.role === "sales";
  const today = pragueDay(new Date());
  const thisMonth = today.slice(0, 7);
  const month = monthKey(new Date());

  const [
    userDoc,
    projectsSnap,
    invoicesSnap,
    subsSnap,
    clientsSnap,
    prospectsSnap,
    domainsSnap,
    webInstancesSnap,
    ticketsSnap,
    submissionsSnap,
    costData,
    calendarEvents,
  ] = await Promise.all([
    db.collection("users").doc(user.uid).get(),
    db.collection("projects").get(),
    isSales ? null : db.collection("invoices").get(),
    isSales ? null : db.collection("subscriptions").where("status", "==", "active").get(),
    db.collection("clients").get(),
    db.collection("prospects").get(),
    db.collection("domains").get(),
    isSales ? null : db.collection("instances").where("type", "==", "web").get(),
    isSales ? null : db.collection("tickets").get(),
    isSales ? null : db.collection("card-submissions").get(),
    isSales ? null : loadCostData(month),
    isSales ? null : loadCalendarEvents(db, { from: today, to: addDays(today, 6) }),
  ]);

  // Klienti (sales jen vlastní).
  const clientById = new Map<string, { name: string; deleted: boolean; owner?: string }>();
  clientsSnap.docs.forEach((d) =>
    clientById.set(d.id, { name: d.data().name as string, deleted: !!d.data().deletedAt, owner: d.data().salesOwnerUid as string | undefined })
  );
  const ownClient = (id: string | null | undefined) => {
    const c = id ? clientById.get(id) : undefined;
    return !!c && !c.deleted && (!isSales || c.owner === user.uid);
  };
  const visibleClients = clientsSnap.docs.filter((d) => ownClient(d.id));
  const subs = (subsSnap?.docs ?? []).filter((d) => !d.data().internal);
  const clients: DashboardData["clients"] = {
    active: visibleClients.filter((d) => d.data().status === "active").length,
    onboarding: visibleClients.filter((d) => d.data().status === "onboarding").length,
    paused: visibleClients.filter((d) => d.data().status === "paused").length,
    newThisMonth: visibleClients.filter((d) => {
      const created = toDate(d.data().createdAt);
      return !!created && pragueDay(created).slice(0, 7) === thisMonth;
    }).length,
    subscriptions: subsSnap ? subs.length : null,
    promoEnding: subsSnap
      ? subs.filter((d) => {
          const until = toDate(d.data().discountUntil);
          if (!until || !d.data().discountPercent) return false;
          const day = pragueDay(until);
          return day >= today && day <= addDays(today, SOON_DAYS);
        }).length
      : null,
  };

  // Oslovení a follow-upy (sales jen vlastní).
  const prospects = prospectsSnap.docs.filter((d) => !d.data().deletedAt && (!isSales || d.data().ownerUid === user.uid));
  const followUps: CalendarEvent[] = prospects.flatMap((d) => {
    const p = d.data();
    const due = toDate(p.nextFollowUpAt);
    if (TERMINAL_PROSPECT.includes(p.status as string) || !due || pragueDay(due) > today) return [];
    return [
      {
        id: `followup-${d.id}`,
        kind: "followup" as const,
        day: pragueDay(due),
        state: "todo" as const,
        title: `Follow-up: ${p.name}`,
        subject: p.name as string,
        detail: (p.company as string) || "Oslovení",
        clientId: null,
        href: `/prospects/${d.id}`,
        action: { label: "Otevřít", href: `/prospects/${d.id}` },
      },
    ];
  });
  const openProjects = projectsSnap.docs.filter((d) => {
    const p = d.data();
    return !p.deletedAt && (p.status === "inquiry" || p.status === "in_progress") && ownClient(p.clientId);
  });
  const sales: DashboardData["sales"] = {
    followUpsDue: followUps.length,
    followUpsOverdue: followUps.filter((f) => f.day < today).length,
    fresh: prospects.filter((d) => d.data().status === "new").length,
    inProgress: prospects.filter((d) => ["contacted", "responding"].includes(d.data().status as string)).length,
    openProjects: openProjects.length,
    openProjectsValue: openProjects.reduce((sum, d) => sum + ((d.data().price as number | null) ?? 0), 0),
  };

  // Domény k obnovení do 30 dnů (bez automatického obnovení, i po termínu).
  const domainsSoon = domainsSnap.docs.filter((d) => {
    const due = toDate(d.data().renewalAt);
    const clientId = d.data().clientId as string | null;
    if (!due || d.data().autoRenew || pragueDay(due) > addDays(today, SOON_DAYS)) return false;
    return clientId ? ownClient(clientId) : !isSales;
  });

  // Co je dnes potřeba: admin/member z kalendáře, obchodník domény svých klientů. K tomu follow-upy.
  const domainEvents: CalendarEvent[] = domainsSoon.map((d) => ({
    id: `domain-${d.id}`,
    kind: "domain",
    day: pragueDay(toDate(d.data().renewalAt)!),
    state: "todo",
    title: `Obnovit doménu: ${d.data().name}`,
    subject: d.data().name as string,
    detail: clientById.get(d.data().clientId)?.name ?? "",
    clientId: d.data().clientId ?? null,
    href: `/clients/${d.data().clientId}`,
  }));
  const agenda = [...(calendarEvents ?? domainEvents), ...followUps];

  // Čeká na tebe: klient napsal v HUBu a tým zatím neodpověděl, nezpracované podklady.
  const inbox: CalendarEvent[] = [];
  for (const d of ticketsSnap?.docs ?? []) {
    const t = d.data();
    if (t.deletedAt || t.source !== "hub" || t.lastMessageFrom !== "client" || DONE_TICKET.includes(t.status)) continue;
    const at = toDate(t.lastMessageAt) ?? toDate(t.createdAt);
    inbox.push({
      id: `reply-${d.id}`,
      kind: "reply",
      day: today,
      state: "todo",
      title: `Odpovědět klientovi: ${clientById.get(t.clientId)?.name ?? "Klient"}`,
      subject: clientById.get(t.clientId)?.name ?? "Klient",
      detail: `${t.title}${at ? ` · ${czDate(at)}` : ""}`,
      clientId: t.clientId ?? null,
      href: `/backlog/${d.id}`,
      action: { label: "Odpovědět", href: `/backlog/${d.id}` },
    });
  }
  for (const d of submissionsSnap?.docs ?? []) {
    const s = d.data();
    if (s.processedAt) continue;
    const at = toDate(s.createdAt);
    const view = normalizeSubmission(s as RawSubmission);
    const href = `/submissions/${encodeURIComponent(d.id)}`;
    inbox.push({
      id: `submission-${d.id}`,
      kind: "submission",
      day: today,
      state: "todo",
      title: `Podklady: ${view.fullName || view.email || "bez jména"}`,
      subject: view.fullName || view.email || "bez jména",
      detail: at ? `vyplněno ${czDate(at)}` : "čeká na zpracování",
      clientId: null,
      href,
      action: { label: "Zpracovat", href },
    });
  }

  // Peníze (admin/member).
  let money: DashboardData["money"] = null;
  if (invoicesSnap && subsSnap && costData) {
    const now = new Date();
    const m = { invoiced: 0, paid: 0, unpaidCount: 0, unpaidSum: 0, overdueCount: 0, overdueSum: 0 };
    for (const doc of invoicesSnap.docs) {
      const d = doc.data();
      const amount = (d.amount as number) ?? 0;
      const issued = toDate(d.issuedAt);
      const paid = toDate(d.paidAt);
      const due = toDate(d.dueAt);
      if (d.status !== "draft" && d.status !== "cancelled" && issued && pragueDay(issued).slice(0, 7) === thisMonth) m.invoiced += amount;
      if (d.status === "paid" && paid && pragueDay(paid).slice(0, 7) === thisMonth) m.paid += amount;
      if (d.status === "sent" || d.status === "overdue") {
        m.unpaidCount++;
        m.unpaidSum += amount;
        // Po splatnosti i bez cronu (stav `overdue` zapisuje jen zapnutý fakturační cron).
        if (d.status === "overdue" || (due && due < now)) {
          m.overdueCount++;
          m.overdueSum += amount;
        }
      }
    }
    money = {
      mrr: computeMrr(subsSnap.docs),
      ...m,
      costs: costsInMonth(costData.services, costData.payments, costData.domains, month, costData.rates).total,
      costsPlan: planForMonth(costData.services, costData.domains, month, costData.rates),
    };
  }

  // Provoz (admin/member): Backlog, podklady, domény, weby bez měření.
  let ops: DashboardData["ops"] = null;
  if (ticketsSnap) {
    const open = ticketsSnap.docs.filter((d) => !d.data().deletedAt && !DONE_TICKET.includes(d.data().status));
    const count = (status: string) => open.filter((d) => d.data().status === status).length;
    ops = {
      open: open.length,
      byStatus: { open: count("open"), in_progress: count("in_progress"), code_review: count("code_review"), waiting_client: count("waiting_client") },
      mine: open.filter((d) => d.data().assigneeUid === user.uid).length,
      urgent: open.filter((d) => d.data().priority === "urgent").length,
      awaitingReply: inbox.filter((e) => e.kind === "reply").length,
      submissions: inbox.filter((e) => e.kind === "submission").length,
      domainsSoon: domainsSoon.length,
      websWithoutTracking: (webInstancesSnap?.docs ?? []).filter((doc) => {
        const d = doc.data();
        if (d.deletedAt || d.status === "offline" || !ownClient(d.clientId)) return false;
        return !d.ga4ConnectedAt || !d.ga4PropertyId || !d.searchConsoleConnectedAt;
      }).length,
    };
  }

  return (
    <DashboardClient
      data={{
        name: greetingName(userDoc.data()?.displayName as string | undefined),
        today,
        isSales,
        agenda,
        inbox,
        money,
        clients,
        sales,
        ops,
        chartSeries: invoicesSnap ? buildChartSeries(invoicesSnap.docs, clientsSnap.docs, subsSnap?.docs ?? []) : [],
      }}
    />
  );
}

type Doc = FirebaseFirestore.QueryDocumentSnapshot;

/**
 * Série pro filtrovatelný graf (12 měsíců). Peněžní řady = součet za měsíc;
 * počty = kumulativně dle createdAt (poslední měsíc odpovídá aktuálnímu stavu).
 * Stavové počty jsou aproximace (bez historie stavů).
 */
function buildChartSeries(invoices: Doc[], clientDocsAll: Doc[], subs: Doc[]): DashboardData["chartSeries"] {
  const chartBase = new Date();
  const months = [] as { start: Date; end: Date; key: string }[];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(chartBase.getFullYear(), chartBase.getMonth() - i, 1);
    months.push({
      start: d,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
      key: `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`,
    });
  }
  const ymIndex: Record<string, number> = {};
  months.forEach((m, i) => {
    ymIndex[`${m.start.getFullYear()}-${m.start.getMonth()}`] = i;
  });

  const invoiced = new Array(12).fill(0);
  const revenue = new Array(12).fill(0);
  invoices.forEach((doc) => {
    const d = doc.data();
    const amount = (d.amount as number) ?? 0;
    const iss = toDate(d.issuedAt);
    const paid = toDate(d.paidAt);
    if (iss) {
      const k = `${iss.getFullYear()}-${iss.getMonth()}`;
      if (k in ymIndex) invoiced[ymIndex[k]] += amount;
    }
    if (paid) {
      const k = `${paid.getFullYear()}-${paid.getMonth()}`;
      if (k in ymIndex) revenue[ymIndex[k]] += amount;
    }
  });

  type Item = { createdAt?: Date; status?: string };
  const clientDocs: Item[] = clientDocsAll
    .filter((d) => !d.data().deletedAt)
    .map((d) => ({ createdAt: toDate(d.data().createdAt), status: d.data().status as string }));
  const subDocs: Item[] = subs.map((d) => ({ createdAt: toDate(d.data().createdAt) }));
  const cumulative = (items: Item[], pred: (it: Item) => boolean) =>
    months.map((m) => items.filter((it) => pred(it) && it.createdAt && it.createdAt < m.end).length);

  const toData = (arr: number[]) => months.map((m, i) => ({ month: m.key, value: arr[i] }));
  return [
    { key: "invoiced", label: "Vystavené faktury (Kč)", unit: "czk", data: toData(invoiced) },
    { key: "revenue", label: "Měsíční příjmy (Kč)", unit: "czk", data: toData(revenue) },
    { key: "clientsTotal", label: "Počet klientů", unit: "count", data: toData(cumulative(clientDocs, () => true)) },
    { key: "activeClients", label: "Aktivní klienti", unit: "count", data: toData(cumulative(clientDocs, (c) => c.status === "active")) },
    { key: "onboarding", label: "Onboarding", unit: "count", data: toData(cumulative(clientDocs, (c) => c.status === "onboarding")) },
    { key: "subscriptions", label: "Počet předplatných", unit: "count", data: toData(cumulative(subDocs, () => true)) },
  ];
}
