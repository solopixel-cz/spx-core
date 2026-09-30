export const PLANS = {
  basic: { label: "Základní", defaultPrice: 399 },
  pro: { label: "Pro růst", defaultPrice: 549 },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Druh služby předplatného (fáze 34C). */
export const SERVICE_LABELS = {
  card: "Digitální vizitka",
  web: "Web",
  other: "Jiná služba",
} as const;

/**
 * Lidský název předplatného — do UI, položek faktur i cronu.
 * Vizitka: „Digitální vizitka · Pro růst"; web / jiné: vlastní název (fallback druh služby).
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
    const plan = sub.plan ? (PLANS[sub.plan as PlanKey]?.label ?? sub.plan) : null;
    return plan ? `${SERVICE_LABELS.card} · ${plan}` : SERVICE_LABELS.card;
  }
  return SERVICE_LABELS[service] ?? "Předplatné";
}
