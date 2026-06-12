export const PLANS = {
  basic: { label: "Základní", defaultPrice: 399 },
  pro: { label: "Pro růst", defaultPrice: 549 },
} as const;

export type PlanKey = keyof typeof PLANS;
