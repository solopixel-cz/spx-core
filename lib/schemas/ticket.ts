import { z } from "zod";
import { baseFields } from "./timestamp";

export const ticketSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1),
  instanceId: z.string().optional(),
  type: z.enum(["bug", "change_request"]),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum([
    "open",
    "in_progress",
    "waiting_client",
    "resolved",
    "closed",
  ]),
  assigneeUid: z.string().optional(),
  attachments: z.array(z.string()),
});

export type Ticket = z.infer<typeof ticketSchema>;

export const ticketFormSchema = z.object({
  clientId: z.string().min(1, "Vyberte klienta"),
  instanceId: z.string().optional(),
  type: z.enum(["bug", "change_request"]),
  title: z.string().min(1, "Titul je povinný"),
  description: z.string().min(1, "Popis je povinný"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assigneeUid: z.string().optional(),
});

export type TicketFormData = z.infer<typeof ticketFormSchema>;
