import { z } from "zod";
import { timestampSchema } from "./timestamp";

export const cardTokenSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  clientId: z.string().optional(),
  createdAt: timestampSchema,
  usedAt: timestampSchema.optional(),
});

export type CardToken = z.infer<typeof cardTokenSchema>;
