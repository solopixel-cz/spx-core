/**
 * Tarify vizitky podle ceníku na webu (spx-web PricingBlock: start / growth / summit).
 * Klíče `basic` a `pro` zůstávají kvůli stávajícím datům, `summit` má stejný kód jako web.
 */
export const PLANS = {
  basic: { label: "Start", defaultPrice: 349 },
  pro: { label: "Růst", defaultPrice: 549 },
  summit: { label: "Náskok", defaultPrice: 749 },
} as const;

export type PlanKey = keyof typeof PLANS;
export const PLAN_KEYS = Object.keys(PLANS) as [PlanKey, ...PlanKey[]];

/** Kód tarifu z poptávky na webu (/kontakt?plan=…) → název tarifu. */
const WEB_PLAN_LABELS: Record<string, string> = {
  start: PLANS.basic.label,
  growth: PLANS.pro.label,
  summit: PLANS.summit.label,
  team: "Pro tým",
};

/** Název tarifu do UI: bere klíč z CRM i kód z webu, neznámý kód vrátí beze změny. */
export function planLabel(plan: string | null | undefined): string | null {
  if (!plan) return null;
  return PLANS[plan as PlanKey]?.label ?? WEB_PLAN_LABELS[plan] ?? plan;
}

/**
 * Kolik měsíčních cen se fakturuje za jedno období (cron, faktura, náhledy, MRR).
 * Vizitka ročně = 10 měsíců (web: „2 měsíce zdarma“), web a jiné služby ročně = 12.
 */
export function billedMonths(sub: { service?: string | null; billingCycle?: string | null }): number {
  if (sub.billingCycle !== "yearly") return 1;
  return (sub.service ?? "card") === "card" ? 10 : 12;
}

/** Druh služby předplatného (fáze 34C). */
export const SERVICE_LABELS = {
  card: "Digitální vizitka",
  web: "Web",
  other: "Jiná služba",
} as const;

/**
 * Lidský název předplatného — do UI, položek faktur i cronu.
 * Vizitka: „Digitální vizitka · Růst"; web / jiné: vlastní název (fallback druh služby).
 * Chybějící `service` = vizitka (stávající data).
 */
export function subscriptionLabel(sub: {
  service?: string | null;
  plan?: string | null;
  label?: string | null;
}): string {
  const service = (sub.service ?? "card") as keyof typeof SERVICE_LABELS;
  if (sub.label?.trim()) return sub.label.trim();
  if (service === "card") {
    const plan = planLabel(sub.plan);
    return plan ? `${SERVICE_LABELS.card} · ${plan}` : SERVICE_LABELS.card;
  }
  return SERVICE_LABELS[service] ?? "Předplatné";
}
