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

// Barva štítku podle jeho textu: stejný štítek má všude stejnou barvu.
const TAG_COLORS = [
  "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300",
];

export function tagColor(tag: string): string {
  let hash = 0;
  for (const ch of tag.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TAG_COLORS[hash % TAG_COLORS.length];
}
