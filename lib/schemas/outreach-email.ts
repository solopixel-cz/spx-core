import { z } from "zod";
import { baseFields } from "./timestamp";

export const outreachEmailStatusValues = [
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
] as const;

// Status progression order (higher index = higher status, only upgrade)
export const statusOrder: Record<string, number> = {
  sent: 0,
  delivered: 1,
  opened: 2,
  clicked: 3,
  bounced: 4,
  complained: 5,
};

export const outreachEmailSchema = z.object({
  ...baseFields,
  prospectId: z.string().min(1),
  toEmail: z.string().email(),
  senderUid: z.string().min(1),
  resendId: z.string().min(1),
  subject: z.string().min(1),
  status: z.enum(outreachEmailStatusValues),
  sentAt: z.any(),
  lastEventAt: z.any().optional(),
});

export type OutreachEmail = z.infer<typeof outreachEmailSchema>;
