/** Sdílená logika stavu obnovení domény — používá tab, hlavička detailu i dashboard. */

export type RenewalLevel = "none" | "ok" | "soon" | "urgent" | "overdue";

export interface RenewalStatus {
  level: RenewalLevel;
  /** Počet dnů do obnovení (záporné = po expiraci); null když termín není. */
  days: number | null;
}

/** Odvodí stav obnovení z ISO data (yyyy-mm-ddT… nebo null). */
export function renewalStatus(renewalAt: string | null | undefined): RenewalStatus {
  if (!renewalAt) return { level: "none", days: null };
  const due = new Date(renewalAt);
  if (isNaN(due.getTime())) return { level: "none", days: null };
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - startToday.getTime()) / 86400000);
  let level: RenewalLevel;
  if (days < 0) level = "overdue";
  else if (days <= 14) level = "urgent";
  else if (days <= 30) level = "soon";
  else level = "ok";
  return { level, days };
}

/** Krátký lidský popis, např. „za 12 dní", „dnes", „po termínu (3 dny)". */
export function renewalLabel(status: RenewalStatus): string {
  if (status.days === null) return "";
  const d = status.days;
  if (d < 0) return `po termínu (${Math.abs(d)} ${plural(Math.abs(d))})`;
  if (d === 0) return "dnes";
  return `za ${d} ${plural(d)}`;
}

function plural(n: number): string {
  if (n === 1) return "den";
  if (n >= 2 && n <= 4) return "dny";
  return "dní";
}

/** Doména → klikatelné URL (doplní https:// když chybí schéma). */
export function domainHref(name: string): string {
  const trimmed = name.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}
