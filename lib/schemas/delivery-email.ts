import { z } from "zod";
import { baseFields } from "./timestamp";
import { emailStatusValues } from "./email-status";

export const deliveryEmailSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1),
  instanceId: z.string().min(1),
  toEmail: z.string().email(),
  senderUid: z.string().min(1),
  resendId: z.string().min(1),
  subject: z.string().min(1),
  status: z.enum(emailStatusValues),
  sentAt: z.any(),
  lastEventAt: z.any().optional(),
});

export type DeliveryEmail = z.infer<typeof deliveryEmailSchema>;
