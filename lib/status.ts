type StatusColor = "green" | "yellow" | "red" | "blue" | "gray";

interface StatusConfig {
  label: string;
  color: StatusColor;
}

// Client status
export const clientStatus: Record<string, StatusConfig> = {
  onboarding: { label: "Onboarding", color: "yellow" },
  active: { label: "Aktivní", color: "green" },
  paused: { label: "Pozastavený", color: "gray" },
  churned: { label: "Odešlý", color: "red" },
};

// Lead stage
export const leadStage: Record<string, StatusConfig> = {
  new: { label: "Nový", color: "blue" },
  contacted: { label: "Osloven", color: "blue" },
  demo: { label: "Demo", color: "yellow" },
  offer: { label: "Nabídka", color: "yellow" },
  contract: { label: "Smlouva", color: "green" },
  onboarding: { label: "Onboarding", color: "yellow" },
  won: { label: "Vyhráno", color: "green" },
  lost: { label: "Ztraceno", color: "red" },
};

// Invoice status
export const invoiceStatus: Record<string, StatusConfig> = {
  draft: { label: "Koncept", color: "gray" },
  sent: { label: "Odesláno", color: "blue" },
  paid: { label: "Zaplaceno", color: "green" },
  overdue: { label: "Po splatnosti", color: "red" },
  cancelled: { label: "Stornováno", color: "gray" },
};

// Ticket status
export const ticketStatus: Record<string, StatusConfig> = {
  open: { label: "Otevřený", color: "blue" },
  in_progress: { label: "V řešení", color: "blue" },
  waiting_client: { label: "Čeká na klienta", color: "yellow" },
  resolved: { label: "Vyřešený", color: "green" },
  closed: { label: "Uzavřený", color: "gray" },
};

// Ticket priority
export const ticketPriority: Record<string, StatusConfig> = {
  low: { label: "Nízká", color: "gray" },
  medium: { label: "Střední", color: "yellow" },
  high: { label: "Vysoká", color: "red" },
  urgent: { label: "Urgentní", color: "red" },
};

// Ticket type
export const ticketType: Record<string, StatusConfig> = {
  bug: { label: "Bug", color: "red" },
  change_request: { label: "Změna", color: "blue" },
};

// Task status
export const taskStatus: Record<string, StatusConfig> = {
  open: { label: "Otevřený", color: "blue" },
  done: { label: "Hotovo", color: "green" },
};

// Instance status
export const instanceStatus: Record<string, StatusConfig> = {
  setup: { label: "Příprava", color: "yellow" },
  live: { label: "Živá", color: "green" },
  maintenance: { label: "Údržba", color: "yellow" },
  offline: { label: "Offline", color: "red" },
};

// Subscription status
export const subscriptionStatus: Record<string, StatusConfig> = {
  trial: { label: "Zkušební", color: "yellow" },
  active: { label: "Aktivní", color: "green" },
  past_due: { label: "Po splatnosti", color: "red" },
  cancelled: { label: "Zrušeno", color: "gray" },
};

// Lead source
export const leadSource: Record<string, StatusConfig> = {
  web: { label: "Web", color: "blue" },
  referral: { label: "Doporučení", color: "green" },
  outreach: { label: "Oslovení", color: "yellow" },
  event: { label: "Akce", color: "yellow" },
  other: { label: "Jiné", color: "gray" },
};

// Prospect status
export const prospectStatus: Record<string, StatusConfig> = {
  new: { label: "Nový", color: "blue" },
  contacted: { label: "Osloven", color: "yellow" },
  responding: { label: "Reaguje", color: "green" },
  not_interested: { label: "Nemá zájem", color: "gray" },
  unreachable: { label: "Nedostupný", color: "red" },
  converted: { label: "Konvertován", color: "green" },
};

// Prospect contact channel
export const prospectChannel: Record<string, StatusConfig> = {
  phone: { label: "Telefon", color: "blue" },
  email: { label: "E-mail", color: "blue" },
  linkedin: { label: "LinkedIn", color: "blue" },
  in_person: { label: "Osobně", color: "green" },
};

// Prospect contact result
export const prospectResult: Record<string, StatusConfig> = {
  no_answer: { label: "Nedovoláno", color: "gray" },
  left_message: { label: "Nechal vzkaz", color: "yellow" },
  conversation: { label: "Proběhl rozhovor", color: "green" },
  email_sent: { label: "Poslán e-mail", color: "blue" },
};

// Outreach email status
export const outreachEmailStatus: Record<string, StatusConfig> = {
  sent: { label: "Odesláno", color: "blue" },
  delivered: { label: "Doručeno", color: "blue" },
  opened: { label: "Otevřeno", color: "yellow" },
  clicked: { label: "Kliknuto", color: "green" },
  bounced: { label: "Nedoručeno", color: "red" },
  complained: { label: "Stížnost", color: "red" },
};

/** CSS classes for status badge colors */
export const statusColorClasses: Record<StatusColor, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  yellow: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  blue: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800",
  gray: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

/** Get badge className for a status value from a status map */
export function getStatusClasses(
  map: Record<string, StatusConfig>,
  value: string
): string {
  const config = map[value];
  if (!config) return statusColorClasses.gray;
  return statusColorClasses[config.color];
}

/** Get label for a status value */
export function getStatusLabel(
  map: Record<string, StatusConfig>,
  value: string
): string {
  return map[value]?.label ?? value;
}
