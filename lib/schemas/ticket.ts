import { z } from "zod";
import { baseFields } from "./timestamp";

export const TICKET_TYPES = ["bug", "change_request", "idea", "feedback"] as const;

/** Příloha ticketu nebo zprávy (nahraná z HUBu do Storage, stažení přes token). */
export const ticketFileSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  path: z.string(),
  url: z.string().url(),
});

export type TicketFile = z.infer<typeof ticketFileSchema>;

export const ticketSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1),
  instanceId: z.string().optional(),
  type: z.enum(TICKET_TYPES),
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
  attachments: z.array(ticketFileSchema),
  // Externí odkazy k tiketu (např. fotky na Google Drive). Může jich být víc.
  links: z.array(z.string().url()),
  // Zpětná vazba z HUBu (spec/context/data-model.md → tickets): klient vidí stav a vlákno.
  source: z.enum(["crm", "hub"]).optional(),
  createdByEmail: z.string().email().optional(),
  messageCount: z.number().optional(),
  lastMessageFrom: z.enum(["client", "team"]).optional(),
  unreadByTeam: z.boolean().optional(),
  unreadByClient: z.boolean().optional(),
});

export type Ticket = z.infer<typeof ticketSchema>;

export const ticketFormSchema = z.object({
  clientId: z.string().min(1, "Vyberte klienta"),
  instanceId: z.string().optional(),
  type: z.enum(TICKET_TYPES),
  title: z.string().min(1, "Titul je povinný"),
  description: z.string().min(1, "Popis je povinný"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assigneeUid: z.string().optional(),
  links: z.array(z.string().url("Neplatný odkaz")).optional(),
});

export type TicketFormData = z.infer<typeof ticketFormSchema>;

/** Odpověď týmu klientovi do vlákna ticketu z HUBu. */
export const ticketReplySchema = z.object({
  text: z.string().trim().min(1, "Napište odpověď").max(4000, "Nejvýš 4000 znaků"),
  /** Poslat klientovi i e-mail a push (jinak jen do HUBu). */
  notify: z.boolean().default(true),
});
