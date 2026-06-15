import { z } from "zod";
import { baseFields } from "./timestamp";
import { emailStatusValues, statusOrder } from "./email-status";

// Re-export for backwards compatibility
export { emailStatusValues as outreachEmailStatusValues, statusOrder };

export const outreachEmailSchema = z.object({
  ...baseFields,
  prospectId: z.string().min(1),
  toEmail: z.string().email(),
  senderUid: z.string().min(1),
  resendId: z.string().min(1),
  subject: z.string().min(1),
  status: z.enum(emailStatusValues),
  sentAt: z.any(),
  lastEventAt: z.any().optional(),
});

export type OutreachEmail = z.infer<typeof outreachEmailSchema>;
