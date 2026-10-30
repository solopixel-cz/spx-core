import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const user = await requireAuth();
  const db = getAdminFirestore();
  const isSales = user.role === "sales";

  const [
    projectsSnap,
    invoicesSnap,
    subsSnap,
    clientsSnap,
    prospectsSnap,
    domainsSnap,
  ] = await Promise.all([
    db.collection("projects").get(),
    isSales ? Promise.resolve(null) : db.collection("invoices").get(),
    isSales ? Promise.resolve(null) : db.collection("subscriptions").where("status", "==", "active").get(),
    db.collection("clients").get(),
    db.collection("prospects").get(),
    db.collection("domains").get(),
  ]);

  // Rozpracované zakázky (poptávka / rozpracováno) — hodnota k vyfakturování (nahradila pipeline leadů)
  let openProjectsValue = 0;
  let openProjectsCount = 0;
  projectsSnap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.deletedAt || (d.status !== "inquiry" && d.status !== "in_progress")) return;
    openProjectsCount++;
    openProjectsValue += (d.price as number | null) ?? 0;
  });

  // Financial metrics (admin/member only)
  let mrr = 0;
  let paidThisMonth = 0;
  let invoicedThisMonth = 0;
  let unpaidInvoicesCount = 0;
  const overdueInvoices = { count: 0, sum: 0 };

  if (!isSales && invoicesSnap && subsSnap) {
    subsSnap.docs.forEach((doc) => {
      const d = doc.data();
      if (d.internal) return; // interní vizitky negenerují příjem
      const price = d.priceMonthly as number;
      const discount = (d.discountPercent as number) || 0;
      // priceMonthly je vždy měsíční cena (roční fakturace = 12×, viz cron) → MRR = měsíční cena po slevě.
      mrr += price * (1 - discount / 100);
    });
    mrr = Math.round(mrr);

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

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
      // Vystavené a nezaplacené (odesláno nebo po splatnosti).
      if (d.status === "sent" || d.status === "overdue") {
        unpaidInvoicesCount++;
      }
      if (paidAt) {
        if (paidAt.getMonth() === thisMonth && paidAt.getFullYear() === thisYear) {
          paidThisMonth += amount;
        }
      }
    });
  }

  // Počty klientů podle stavu (sales počítá jen vlastní)
  const visibleClients = clientsSnap.docs.filter(
    (d) => !d.data().deletedAt && (!isSales || d.data().salesOwnerUid === user.uid)
  );
  const activeClientsCount = visibleClients.filter((d) => d.data().status === "active").length;
  const onboardingCount = visibleClients.filter((d) => d.data().status === "onboarding").length;

  // Série pro filtrovatelný dashboard graf (12 měsíců, admin/member).
  // Peněžní řady = součet za měsíc; počty = kumulativně dle createdAt (poslední
  // měsíc odpovídá aktuálním KPI). Stavové počty jsou aproximace (bez historie stavů).
  type ChartSeries = {
    key: string;
    label: string;
    unit: "czk" | "count";
    data: { month: string; value: number }[];
  };
  let chartSeries: ChartSeries[] = [];
  if (!isSales && invoicesSnap) {
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
    invoicesSnap.docs.forEach((doc) => {
      const d = doc.data();
      const amount = (d.amount as number) ?? 0;
      const iss = d.issuedAt?.toDate?.();
      const paid = d.paidAt?.toDate?.();
      if (iss) {
        const k = `${iss.getFullYear()}-${iss.getMonth()}`;
        if (k in ymIndex) invoiced[ymIndex[k]] += amount;
      }
      if (paid) {
        const k = `${paid.getFullYear()}-${paid.getMonth()}`;
        if (k in ymIndex) revenue[ymIndex[k]] += amount;
      }
    });

    const clientDocs = clientsSnap.docs
      .filter((d) => !d.data().deletedAt)
      .map((d) => ({ createdAt: d.data().createdAt?.toDate?.() as Date | undefined, status: d.data().status as string }));
    const subDocs = (subsSnap?.docs ?? []).map((d) => ({
      createdAt: d.data().createdAt?.toDate?.() as Date | undefined,
    }));
    const cumulative = (
      items: { createdAt?: Date }[],
      pred: (it: { createdAt?: Date }) => boolean
    ) => months.map((m) => items.filter((it) => pred(it) && it.createdAt && it.createdAt < m.end).length);

    const toData = (arr: number[]) => months.map((m, i) => ({ month: m.key, value: arr[i] }));
    chartSeries = [
      { key: "invoiced", label: "Vystavené faktury (Kč)", unit: "czk", data: toData(invoiced) },
      { key: "revenue", label: "Měsíční příjmy (Kč)", unit: "czk", data: toData(revenue) },
      { key: "clientsTotal", label: "Počet klientů", unit: "count", data: toData(cumulative(clientDocs, () => true)) },
      { key: "activeClients", label: "Aktivní klienti", unit: "count", data: toData(cumulative(clientDocs, (c) => (c as { status?: string }).status === "active")) },
      { key: "onboarding", label: "Onboarding", unit: "count", data: toData(cumulative(clientDocs, (c) => (c as { status?: string }).status === "onboarding")) },
      { key: "subscriptions", label: "Počet předplatných", unit: "count", data: toData(cumulative(subDocs, () => true)) },
    ];
  }

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

  // Blížící se obnovení domén — domény s renewalAt do 30 dnů (vč. po termínu),
  // bez auto-renew. Sales vidí jen domény svých klientů.
  const domainClientById: Record<string, { name: string; deleted: boolean; owner?: string }> = {};
  clientsSnap.docs.forEach((d) => {
    domainClientById[d.id] = {
      name: d.data().name as string,
      deleted: !!d.data().deletedAt,
      owner: d.data().salesOwnerUid as string | undefined,
    };
  });
  const domainNowDate = new Date();
  const domainHorizon = new Date(domainNowDate.getTime() + 30 * 86400000);
  const domainStartToday = new Date(domainNowDate);
  domainStartToday.setHours(0, 0, 0, 0);
  const upcomingDomainRenewals = domainsSnap.docs
    .map((doc) => {
      const d = doc.data();
      const due = d.renewalAt?.toDate?.() as Date | undefined;
      const client = domainClientById[d.clientId as string];
      if (!due || !client || client.deleted || d.autoRenew) return null;
      if (isSales && client.owner !== user.uid) return null;
      return {
        id: doc.id,
        clientId: d.clientId as string,
        clientName: client.name,
        domainName: d.name as string,
        renewalAt: due.toISOString(),
        overdue: due < domainStartToday,
        _due: due,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x._due <= domainHorizon)
    .sort((a, b) => a.renewalAt.localeCompare(b.renewalAt))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ _due, ...rest }) => rest);

  return (
    <DashboardClient
      openProjectsValue={openProjectsValue}
      openProjectsCount={openProjectsCount}
      mrr={mrr}
      paidThisMonth={paidThisMonth}
      invoicedThisMonth={invoicedThisMonth}
      chartSeries={chartSeries}
      overdueInvoices={overdueInvoices}
      followUps={followUps}
      upcomingDomainRenewals={upcomingDomainRenewals}
      activeClients={activeClientsCount}
      onboardingCount={onboardingCount}
      unpaidInvoices={unpaidInvoicesCount}
      userRole={user.role}
    />
  );
}
