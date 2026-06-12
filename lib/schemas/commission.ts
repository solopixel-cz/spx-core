import { z } from "zod";
import { baseFields } from "./timestamp";

export const commissionStatusValues = ["pending", "paid", "reversed"] as const;

export const commissionSchema = z.object({
  ...baseFields,
  invoiceId: z.string().min(1),
  clientId: z.string().min(1),
  salesUid: z.string().min(1),
  baseAmount: z.number(),
  rate: z.number(),
  amount: z.number(),
  status: z.enum(commissionStatusValues),
  earnedAt: z.any(),
  paidAt: z.any().optional(),
  payoutNote: z.string().optional(),
});

export type Commission = z.infer<typeof commissionSchema>;
