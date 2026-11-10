export const CURRENCIES = ["CZK", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];
/** Kč za 1 jednotku měny (ČNB, lib/cnb.ts). */
export type Rates = Record<Currency, number>;

/**
 * Náklady provozu (přehled /costs). Čistá logika bez Firestore, sdílená
 * serverem i klientem. Datový model: costServices, costPayments, domains.price.
 */

export const COST_CATEGORIES = {
  hosting: "Hosting",
  cloud: "Cloud",
  ai: "AI",
  tools: "Nástroje",
  other: "Ostatní",
} as const;
export type CostCategory = keyof typeof COST_CATEGORIES;

/** Kategorie v přehledu včetně domén (ty nemají službu, počítají se z domains.price). */
export const CATEGORY_LABELS: Record<CostCategory | "domains", string> = {
  ...COST_CATEGORIES,
  domains: "Domény",
};

export const BILLING_LABELS = {
  monthly: "Měsíčně",
  yearly: "Ročně",
  usage: "Podle spotřeby",
  once: "Jednorázová platba",
} as const;
export type CostBilling = keyof typeof BILLING_LABELS;

export interface CostService {
  id: string;
  name: string;
  vendor: string | null;
  category: CostCategory;
  billing: CostBilling;
  /** Za periodu; u `usage` odhad za měsíc, u `once` celá platba. */
  amount: number;
  currency: Currency;
  /** Jen yearly, ISO. */
  nextPaymentAt: string | null;
  /** U `once` datum platby. */
  startedAt: string;
  endedAt: string | null;
  note: string | null;
}

export interface CostPayment {
  id: string;
  serviceId: string;
  /** YYYY-MM */
  month: string;
  amount: number;
  currency: Currency;
  rate: number;
  amountCzk: number;
  paidAt: string | null;
  note: string | null;
}

export type EntryStatus = "paid" | "planned" | "missing";

export interface MonthEntry {
  service: CostService;
  status: EntryStatus;
  czk: number;
  payment: CostPayment | null;
}

/** ID platby: jedna na službu a měsíc. */
export const paymentId = (serviceId: string, month: string) => `${serviceId}_${month}`;

/** Date nebo ISO → 'YYYY-MM'. */
export function monthKey(date: Date | string): string {
  if (typeof date === "string") return date.slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Posledních `count` měsíců do `now` včetně, od nejstaršího. */
export function lastMonths(count: number, now: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, i) =>
    monthKey(new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)),
  );
}

const MONTH_NAMES = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];
/** 'YYYY-MM' → „listopad 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function isActiveIn(service: CostService, month: string): boolean {
  // Jednorázová platba patří jen do měsíce, kdy se platila.
  if (service.billing === "once") return monthKey(service.startedAt) === month;
  return monthKey(service.startedAt) <= month && (!service.endedAt || monthKey(service.endedAt) >= month);
}

/** Plán v Kč za měsíc: roční / 12, usage = odhad, jednorázová platba do plánu nepatří. */
export function planMonthlyCzk(service: CostService, rates: Rates): number {
  if (service.billing === "once") return 0;
  const czk = service.amount * rates[service.currency];
  return service.billing === "yearly" ? czk / 12 : czk;
}

/** Roční služba se platí v měsíci výročí `nextPaymentAt`. */
function isYearlyDueIn(service: CostService, month: string): boolean {
  return !!service.nextPaymentAt && monthKey(service.nextPaymentAt).slice(5) === month.slice(5);
}

/**
 * Náklady služeb za měsíc. Zapsaná platba má přednost; jinak pevná služba
 * počítá plán („dle plánu"), usage bez zápisu je „nezadáno" (0 Kč).
 */
export function monthEntries(
  services: CostService[],
  payments: CostPayment[],
  month: string,
  rates: Rates,
): MonthEntry[] {
  const byId = new Map(payments.filter((p) => p.month === month).map((p) => [p.serviceId, p]));
  const entries: MonthEntry[] = [];
  for (const service of services) {
    const payment = byId.get(service.id) ?? null;
    if (payment) {
      entries.push({ service, status: "paid", czk: payment.amountCzk, payment });
      continue;
    }
    if (!isActiveIn(service, month)) continue;
    if (service.billing === "monthly" || service.billing === "once") {
      entries.push({ service, status: "planned", czk: service.amount * rates[service.currency], payment: null });
    } else if (service.billing === "yearly") {
      if (isYearlyDueIn(service, month)) {
        entries.push({ service, status: "planned", czk: service.amount * rates[service.currency], payment: null });
      }
    } else {
      entries.push({ service, status: "missing", czk: 0, payment: null });
    }
  }
  return entries;
}

/** Domény v plánu: roční ceny rozpočítané na měsíc. */
export function domainsMonthlyCzk(prices: number[]): number {
  return prices.reduce((sum, p) => sum + p, 0) / 12;
}

export function sumCzk(values: number[]): number {
  return Math.round(values.reduce((s, v) => s + v, 0));
}

/** Služby podle kategorie (plán za měsíc), od nejdražší. */
export function planByCategory(
  services: CostService[],
  month: string,
  rates: Rates,
  domainsMonthly: number,
): { category: CostCategory | "domains"; czk: number }[] {
  const totals = new Map<CostCategory | "domains", number>();
  for (const s of services) {
    if (s.billing === "once" || !isActiveIn(s, month)) continue;
    totals.set(s.category, (totals.get(s.category) ?? 0) + planMonthlyCzk(s, rates));
  }
  if (domainsMonthly > 0) totals.set("domains", domainsMonthly);
  return [...totals.entries()]
    .map(([category, czk]) => ({ category, czk: Math.round(czk) }))
    .sort((a, b) => b.czk - a.czk);
}

/** Roční platby v příštích `days` dnech (od nejbližší). */
export function upcomingYearly(services: CostService[], now: Date = new Date(), days = 45) {
  const horizon = now.getTime() + days * 86400000;
  return services
    .filter((s) => s.billing === "yearly" && !s.endedAt && s.nextPaymentAt)
    .filter((s) => new Date(s.nextPaymentAt!).getTime() <= horizon)
    .sort((a, b) => a.nextPaymentAt!.localeCompare(b.nextPaymentAt!));
}

/** Částka v původní měně, např. „20 USD", „1 290 Kč". */
export function formatOriginal(amount: number, currency: Currency): string {
  const n = amount.toLocaleString("cs-CZ", { maximumFractionDigits: 2 });
  return currency === "CZK" ? `${n} Kč` : `${n} ${currency}`;
}

/** Doména s cenou obnovení (domains.price, Kč za rok). */
export interface CostDomain {
  id: string;
  name: string;
  clientName: string | null;
  price: number;
  /** ISO; měsíc výročí = měsíc platby. */
  renewalAt: string | null;
}

/** Domény placené v daném měsíci (měsíc výročí `renewalAt`). Bez data se nepočítají. */
export function domainsDueIn(domains: CostDomain[], month: string): CostDomain[] {
  return domains.filter((d) => d.renewalAt && monthKey(d.renewalAt).slice(5) === month.slice(5));
}

/** Obnovení domén v příštích `days` dnech (od nejbližší). */
export function upcomingDomains(domains: CostDomain[], now: Date = new Date(), days = 45): CostDomain[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const horizon = now.getTime() + days * 86400000;
  return domains
    .filter((d) => d.renewalAt)
    .filter((d) => {
      const t = new Date(d.renewalAt!).getTime();
      return t >= start.getTime() && t <= horizon;
    })
    .sort((a, b) => a.renewalAt!.localeCompare(b.renewalAt!));
}
