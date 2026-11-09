/** Popisky ticketů sdílené seznamem, detailem a formulářem. */
export const ticketTypeLabels: Record<string, string> = {
  bug: "Bug",
  change_request: "Změna",
  idea: "Nápad",
  feedback: "Zpětná vazba",
};

export const ticketPriorityLabels: Record<string, string> = {
  low: "Nízká",
  medium: "Střední",
  high: "Vysoká",
  urgent: "Urgentní",
};

// Stavy v datech zůstávají (HUB je ukazuje klientovi), v CRM se jmenují jako sloupce Backlogu.
// `closed` je starší „Uzavřený“, patří do Hotovo stejně jako `resolved`.
export const ticketStatusLabels: Record<string, string> = {
  open: "Úkoly",
  in_progress: "Zpracovává se",
  code_review: "Code review",
  waiting_client: "Čekání na klienta",
  resolved: "Hotovo",
  closed: "Hotovo",
};

export const ticketPriorityVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

/** Sloupce Backlogu v pořadí; přesun do Hotovo ukládá `resolved`. */
export const TICKET_STATUSES = ["open", "in_progress", "code_review", "waiting_client", "resolved"];

/** Sloupec, do kterého ticket patří (`closed` → Hotovo). */
export function ticketColumn(status: string): string {
  return status === "closed" ? "resolved" : TICKET_STATUSES.includes(status) ? status : "open";
}

/** Interní ticket nemá klienta (změny v CRM, HUBu apod.). */
export const INTERNAL_LABEL = "Interní";
