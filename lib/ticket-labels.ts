/** Popisky ticketů sdílené seznamem, detailem a formulářem. */
export const ticketTypeLabels: Record<string, string> = { bug: "Bug", change_request: "Změna" };

export const ticketPriorityLabels: Record<string, string> = {
  low: "Nízká",
  medium: "Střední",
  high: "Vysoká",
  urgent: "Urgentní",
};

export const ticketStatusLabels: Record<string, string> = {
  open: "Otevřený",
  in_progress: "V řešení",
  waiting_client: "Čeká na klienta",
  resolved: "Vyřešený",
  closed: "Uzavřený",
};

export const ticketPriorityVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

export const TICKET_STATUSES = ["open", "in_progress", "waiting_client", "resolved", "closed"];
