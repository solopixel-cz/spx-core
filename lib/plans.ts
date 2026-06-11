export const PLANS = {
  basic: { label: "Basic", defaultPrice: 490 },
  standard: { label: "Standard", defaultPrice: 990 },
  premium: { label: "Premium", defaultPrice: 1990 },
} as const;

export type PlanKey = keyof typeof PLANS;
