/**
 * Druhy notifikací, které si každý v týmu (admin, member) zapíná sám v profilu
 * (`users.notificationPrefs`). Chybějící klíč = zapnuto. Obchodníci (sales) je
 * nedostávají. Stejný seznam typů používá spx-hub (`lib/team-notify.ts`).
 */

export interface NotificationTopic {
  key: string;
  label: string;
  description: string;
  /** Strojové typy (`notifications.type`), které téma pokrývá. */
  types: string[];
}

export const NOTIFICATION_TOPICS: NotificationTopic[] = [
  { key: "leads", label: "Nová poptávka z webu", description: "Někdo vyplnil formulář na solopixel.cz", types: ["lead.web"] },
  { key: "submissions", label: "Vyplněné podklady", description: "Klient poslal podklady k vizitce", types: ["submission.filled"] },
  { key: "hub", label: "Zprávy z HUBu", description: "Nová zpětná vazba nebo odpověď klienta", types: ["ticket.hub", "ticket.hub_message"] },
  { key: "emailOpened", label: "Klient otevřel e-mail", description: "E-mail s formulářem nebo fakturou", types: ["email.form_opened", "invoice.opened"] },
  { key: "billing", label: "Automatická fakturace", description: "Vystavené a nezaplacené faktury z fakturačního cronu", types: ["invoice.generated", "invoice.overdue"] },
  { key: "calendar", label: "Ranní souhrn z kalendáře", description: "Co je dnes potřeba udělat (zvoneček a push)", types: ["calendar.digest"] },
];

export type NotificationPrefs = Record<string, boolean>;

export function topicForType(type: string): NotificationTopic | undefined {
  return NOTIFICATION_TOPICS.find((t) => t.types.includes(type));
}

/** Chce uživatel notifikaci daného typu? Neznámý typ nebo chybějící volba = ano. */
export function wantsNotification(prefs: unknown, type: string): boolean {
  const topic = topicForType(type);
  if (!topic || !prefs || typeof prefs !== "object") return true;
  return (prefs as NotificationPrefs)[topic.key] !== false;
}
