import { subscriptionLabel } from "@/lib/plans";

/**
 * Kalendář událostí CRM: počítá se z existujících dat (předplatná, faktury,
 * domény, náklady), nic se zvlášť neeviduje. Stejné události používá stránka
 * /calendar, ranní souhrn (cron) i odběr do Google Kalendáře (ICS).
 *
 * Dny se počítají v pražském čase jako `YYYY-MM-DD`.
 */

/** `followup`, `reply` a `submission` jsou jen na dashboardu (v sekci „Čeká na tebe“), kalendář je nepočítá. */
export type CalendarKind = "issue" | "issued" | "due" | "domain" | "promo" | "cost" | "followup" | "reply" | "submission";

/** todo = je potřeba něco udělat, done = hotovo, info = jen pro přehled. */
export type CalendarState = "todo" | "done" | "info";

export interface CalendarEvent {
  /** Stabilní ID (UID v ICS). */
  id: string;
  kind: CalendarKind;
  /** Den v pražském čase, YYYY-MM-DD. */
  day: string;
  state: CalendarState;
  title: string;
  detail: string;
  clientId: string | null;
  /** Kam vede kliknutí (detail v CRM). */
  href: string;
  /** Hlavní akce, např. vystavit fakturu. */
  action?: { label: string; href: string };
}

export const KIND_LABELS: Record<CalendarKind, string> = {
  issue: "Vystavit fakturu",
  issued: "Faktura vystavena",
  due: "Splatnost faktury",
  domain: "Obnovit doménu",
  promo: "Končí akce",
  cost: "Platba služby",
  followup: "Follow-up",
  reply: "Klient čeká na odpověď",
  submission: "Nové podklady",
};

const DAY_MS = 86_400_000;

/** Den v pražském čase (YYYY-MM-DD). */
export function pragueDay(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });
}

/** Půlnoc daného dne v Praze jako Date. */
export function pragueMidnight(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const hour = Number(
    new Date(utc).toLocaleString("en-GB", { timeZone: "Europe/Prague", hour: "2-digit", hour12: false })
  );
  return new Date(utc - hour * 3_600_000);
}

/** Posun dne o `days` dní (kalendářně, bez ohledu na letní čas). */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Posun o `months` měsíců. Den v měsíci drží `anchorDay` (den, kdy předplatné
 * začalo), u kratšího měsíce poslední den: 31. 1. → 28. 2. → 31. 3.
 */
export function addMonths(day: string, months: number, anchorDay?: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(anchorDay ?? d, last));
  return target.toISOString().slice(0, 10);
}

/**
 * Den v měsíci, kdy se předplatné fakturuje. Drží den startu (31. 1. → 28. 2. →
 * 31. 3.), ale když někdo fakturační den ručně změnil, platí ten nový.
 */
export function billingAnchor(startedAt: Date | null | undefined, next: Date): number {
  const nextDay = pragueDay(next);
  const day = Number(nextDay.slice(8, 10));
  if (!startedAt) return day;
  const startDay = Number(pragueDay(startedAt).slice(8, 10));
  const [y, m] = nextDay.split("-").map(Number);
  const lastOfMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return startDay === day || (day === lastOfMonth && startDay > day) ? startDay : day;
}

/** Další fakturační den předplatného (měsíčně / ročně). */
export function nextCycleDay(day: string, cycle: string | undefined, anchorDay?: number): string {
  return addMonths(day, cycle === "yearly" ? 12 : 1, anchorDay);
}

/** Počet dní mezi dny (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
}

const toDate = (v: unknown): Date | null => {
  const d = (v as { toDate?: () => Date } | null | undefined)?.toDate?.();
  return d && !isNaN(d.getTime()) ? d : null;
};

const czk = (n: number) => `${Math.round(n).toLocaleString("cs-CZ")} Kč`;

/**
 * Načte události v rozsahu `from`–`to` (včetně). Nedodělané úkoly z minulosti
 * (nevystavená faktura, nezaplacená po splatnosti, neobnovená doména) se vrací
 * vždy, i když jsou před `from`, ať nic nezapadne.
 */
export async function loadCalendarEvents(
  db: FirebaseFirestore.Firestore,
  range: { from: string; to: string }
): Promise<CalendarEvent[]> {
  const [clientsSnap, subsSnap, invoicesSnap, domainsSnap, costsSnap] = await Promise.all([
    db.collection("clients").get(),
    db.collection("subscriptions").get(),
    db.collection("invoices").get(),
    db.collection("domains").get(),
    db.collection("costServices").get(),
  ]);

  const clients = new Map<string, string>();
  for (const doc of clientsSnap.docs) {
    const c = doc.data();
    if (!c.deletedAt) clients.set(doc.id, (c.name as string) || "Klient");
  }

  const today = pragueDay(new Date());
  const inRange = (day: string) => day >= range.from && day <= range.to;
  const events: CalendarEvent[] = [];

  // Předplatná: vystavit fakturu k `nextInvoiceAt` a výhled dalších období.
  for (const doc of subsSnap.docs) {
    const s = doc.data();
    const clientName = clients.get(s.clientId);
    if (!clientName || s.internal || s.status === "cancelled") continue;
    const next = toDate(s.nextInvoiceAt);
    const monthly = (s.priceMonthly as number) ?? 0;
    if (next && monthly > 0) {
      const anchor = billingAnchor(toDate(s.startedAt), next);
      const label = subscriptionLabel(s);
      const cycle = s.billingCycle === "yearly" ? "ročně" : "měsíčně";
      const action = { label: "Vystavit", href: `/invoices/new?clientId=${s.clientId}&sub=${doc.id}` };
      let day = pragueDay(next);
      // Aktuální období (i po termínu) je úkol, další období jen výhled.
      for (let i = 0; i < 400 && day <= range.to; i++) {
        if (i === 0 || inRange(day)) {
          events.push({
            id: `issue-${doc.id}-${day}`,
            kind: "issue",
            day,
            state: i === 0 ? "todo" : "info",
            title: `Vystavit fakturu: ${clientName}`,
            detail: `${label}, ${cycle}`,
            clientId: s.clientId,
            href: `/clients/${s.clientId}`,
            action: i === 0 ? action : undefined,
          });
        }
        day = nextCycleDay(day, s.billingCycle, anchor);
      }
    }

    const promoEnd = toDate(s.discountUntil);
    if (promoEnd && s.discountPercent && inRange(pragueDay(promoEnd))) {
      const day = pragueDay(promoEnd);
      events.push({
        id: `promo-${doc.id}-${day}`,
        kind: "promo",
        day,
        state: "info",
        title: `Končí akce: ${clientName}`,
        detail: `Sleva ${s.discountPercent} % na ${subscriptionLabel(s)}, další faktura v plné ceně`,
        clientId: s.clientId,
        href: `/clients/${s.clientId}`,
      });
    }
  }

  // Faktury: vystavené z předplatného (hotovo) a splatnost.
  for (const doc of invoicesSnap.docs) {
    const inv = doc.data();
    const clientName = clients.get(inv.clientId);
    if (!clientName || inv.status === "draft" || inv.status === "cancelled") continue;
    const href = `/invoices/${doc.id}`;
    const amount = czk((inv.amount as number) ?? 0);

    const period = toDate(inv.billingPeriodAt);
    if (period && inRange(pragueDay(period))) {
      const day = pragueDay(period);
      events.push({
        id: `issued-${doc.id}`,
        kind: "issued",
        day,
        state: "done",
        title: `Faktura vystavena: ${clientName}`,
        detail: `${inv.number} · ${amount}`,
        clientId: inv.clientId,
        href,
      });
    }

    const due = toDate(inv.dueAt);
    if (!due) continue;
    const day = pragueDay(due);
    const paid = inv.status === "paid";
    if (!inRange(day) && (paid || day >= range.from)) continue;
    const late = !paid && day < today;
    events.push({
      id: `due-${doc.id}`,
      kind: "due",
      day,
      state: paid ? "done" : "todo",
      title: `${late ? "Po splatnosti" : "Splatnost"}: ${clientName}`,
      detail: `${inv.number} · ${amount}${paid ? " · zaplaceno" : ""}`,
      clientId: inv.clientId,
      href,
      action: paid ? undefined : { label: "Otevřít", href },
    });
  }

  // Domény: obnovení (s automatickým obnovením jen pro přehled).
  for (const doc of domainsSnap.docs) {
    const d = doc.data();
    const renewal = toDate(d.renewalAt);
    if (!renewal) continue;
    const clientId = (d.clientId as string | null) ?? null;
    if (clientId && !clients.has(clientId)) continue;
    const day = pragueDay(renewal);
    const auto = Boolean(d.autoRenew);
    if (!inRange(day) && (auto || day >= range.from)) continue;
    const owner = clientId ? clients.get(clientId)! : "bez klienta";
    events.push({
      id: `domain-${doc.id}-${day}`,
      kind: "domain",
      day,
      state: auto ? "info" : "todo",
      title: `${auto ? "Obnoví se doména" : "Obnovit doménu"}: ${d.name}`,
      detail: [owner, d.registrar, typeof d.price === "number" ? czk(d.price) : null].filter(Boolean).join(" · "),
      clientId,
      href: "/domains",
      action: auto ? undefined : { label: "Domény", href: "/domains" },
    });
  }

  // Roční platby našich služeb (náklady).
  for (const doc of costsSnap.docs) {
    const c = doc.data();
    const next = toDate(c.nextPaymentAt);
    if (c.billing !== "yearly" || !next || toDate(c.endedAt)) continue;
    let day = pragueDay(next);
    for (let i = 0; i < 5 && day <= range.to; i++) {
      if (inRange(day)) {
        events.push({
          id: `cost-${doc.id}-${day}`,
          kind: "cost",
          day,
          state: "info",
          title: `Platba služby: ${c.name}`,
          detail: `${(c.amount as number).toLocaleString("cs-CZ")} ${c.currency} ročně`,
          clientId: null,
          href: "/costs",
        });
      }
      day = addMonths(day, 12);
    }
  }

  return events.sort((a, b) => a.day.localeCompare(b.day) || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, "cs"));
}

/** Úkol po termínu (nevystaveno, nezaplaceno, neobnoveno). */
export const isOverdue = (e: CalendarEvent, today: string) => e.state === "todo" && e.day < today;
