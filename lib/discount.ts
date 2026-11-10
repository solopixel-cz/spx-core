/**
 * Časově omezená sleva předplatného („akce na první 3 měsíce“).
 * `discountUntil` = poslední den, kdy sleva platí (včetně). Chybí = trvalá sleva.
 * Sleva se použije na fakturu, jejíž období začíná nejpozději v ten den.
 * Dny porovnáváme v pražském čase, ať nerozhoduje hodina uložení data.
 */

type DateLike = Date | string | null | undefined;

export interface DiscountSub {
  discountPercent?: number | null;
  discountUntil?: DateLike;
  nextInvoiceAt?: DateLike;
}

export type DiscountStatus =
  | { kind: "permanent" }
  | { kind: "running" | "expired"; until: Date }
  | { kind: "ending"; until: Date; nextInvoiceFull: boolean };

/** Kolik dní před koncem akce se karta předplatného zbarví, i když faktura ještě nepřišla. */
const ENDING_SOON_DAYS = 14;
const DAY_MS = 86_400_000;

function toDate(value: DateLike): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** yyyy-mm-dd v pražském čase (řetězce jde porovnávat přímo). */
function pragueDay(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Prague" });
}

/** Platí sleva pro fakturu s obdobím začínajícím `periodStart`? Vrací procento, nebo 0. */
export function discountFor(sub: DiscountSub, periodStart: Date): number {
  const percent = sub.discountPercent ?? 0;
  if (!percent) return 0;
  const until = toDate(sub.discountUntil);
  if (!until) return percent;
  return pragueDay(periodStart) <= pragueDay(until) ? percent : 0;
}

/**
 * Začátek období příští faktury: příští fakturace, a když už je v minulosti
 * (fakturuje se ručně a datum se neposunulo), dnešek.
 */
export function nextBillingDate(sub: DiscountSub, now = new Date()): Date {
  const next = toDate(sub.nextInvoiceAt);
  return next && next > now ? next : now;
}

/** Stav akce pro upozornění v detailu klienta, nebo null bez slevy. */
export function discountStatus(sub: DiscountSub, now = new Date()): DiscountStatus | null {
  if (!sub.discountPercent) return null;
  const until = toDate(sub.discountUntil);
  if (!until) return { kind: "permanent" };

  const untilDay = pragueDay(until);
  if (untilDay < pragueDay(now)) return { kind: "expired", until };

  const nextInvoiceFull = pragueDay(nextBillingDate(sub, now)) > untilDay;
  const endsSoon = until.getTime() - now.getTime() <= ENDING_SOON_DAYS * DAY_MS;
  if (nextInvoiceFull || endsSoon) return { kind: "ending", until, nextInvoiceFull };
  return { kind: "running", until };
}

/**
 * Poslední den akce na `months` měsíců od `start` (yyyy-mm-dd; prázdné = dnes),
 * např. 2026-11-01 + 3 měsíce → 2027-01-31.
 */
export function discountUntilAfterMonths(start: string | null | undefined, months: number): string {
  const [y, m, d] = (start || pragueDay(new Date())).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, d - 1)).toISOString().slice(0, 10);
}
