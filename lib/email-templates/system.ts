/**
 * Hotové (systémové) e-mailové šablony v jednotném designu SoloPixel.
 * Spravují se v Email marketingu → Šablony vedle vlastních HTML šablon;
 * editovatelný je jen předmět (`templates/<docId>`), tělo je v kódu.
 * Šablony s `forClients` jdou poslat klientovi přes „Poslat e-mail ze šablony“
 * s ručně vloženým odkazem.
 */

import { renderOutreachEmail, DEFAULT_OUTREACH_SUBJECT } from "@/lib/email-templates/outreach";
import { renderFollowupEmail, DEFAULT_FOLLOWUP_SUBJECT } from "@/lib/email-templates/followup";
import { renderCardFormEmail, DEFAULT_CARDFORM_SUBJECT } from "@/lib/email-templates/cardform";
import {
  renderCardFormReminderEmail,
  DEFAULT_CARDFORM_REMINDER_SUBJECT,
} from "@/lib/email-templates/cardform-reminder";
import { renderDeliveryEmail, DEFAULT_DELIVERY_SUBJECT } from "@/lib/email-templates/delivery";
import { buildCardFormUrl } from "@/lib/card-form-url";

export interface SystemTemplate {
  key: string;
  name: string;
  /** K čemu šablona je a kdy se posílá. */
  description: string;
  /** Co se dosadí za {{odkaz}}. */
  linkHint: string;
  /** Ukázkový odkaz pro náhled a testovací e-mail. */
  sampleLink: string;
  /** Dokument `templates/<docId>` s předmětem; API `/api/templates/<docId>`. */
  docId: string;
  defaultSubject: string;
  render: (vars: { jmeno: string; odkaz: string }) => { html: string; text: string };
  /** Jde poslat klientovi z detailu (Poslat e-mail ze šablony). */
  forClients: boolean;
}

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    key: "outreach",
    name: "Oslovení",
    description: "První e-mail prospektům s ukázkou vizitky.",
    linkHint: "demo URL",
    sampleLink: "https://demo.solopixel.cz",
    docId: "outreach-email",
    defaultSubject: DEFAULT_OUTREACH_SUBJECT,
    render: (vars) => renderOutreachEmail(vars),
    forClients: false,
  },
  {
    key: "followup",
    name: "Follow-up",
    description: "Druhý e-mail prospektům, kteří oslovení otevřeli, ale neklikli.",
    linkHint: "demo URL",
    sampleLink: "https://demo.solopixel.cz",
    docId: "followup-email",
    defaultSubject: DEFAULT_FOLLOWUP_SUBJECT,
    render: renderFollowupEmail,
    forClients: false,
  },
  {
    key: "cardform",
    name: "Formulář podkladů",
    description: "Odkaz na formulář podkladů, odchází při vygenerování odkazu u klienta.",
    linkHint: "odkaz na formulář",
    sampleLink: buildCardFormUrl("ukazka"),
    docId: "cardform-email",
    defaultSubject: DEFAULT_CARDFORM_SUBJECT,
    render: renderCardFormEmail,
    forClients: true,
  },
  {
    key: "cardform-reminder",
    name: "Připomenutí podkladů",
    description: "Připomenutí pro klienta, který formulář podkladů ještě nevyplnil.",
    linkHint: "odkaz na formulář",
    sampleLink: buildCardFormUrl("ukazka"),
    docId: "cardform-reminder-email",
    defaultSubject: DEFAULT_CARDFORM_REMINDER_SUBJECT,
    render: renderCardFormReminderEmail,
    forClients: true,
  },
  {
    key: "delivery",
    name: "Předání vizitky",
    description: "E-mail klientovi při předání hotové vizitky.",
    linkHint: "URL vizitky",
    sampleLink: "https://demo.solopixel.cz",
    docId: "delivery-email",
    defaultSubject: DEFAULT_DELIVERY_SUBJECT,
    render: renderDeliveryEmail,
    forClients: true,
  },
];

/** Prefix ID hotové šablony ve výběru šablon (`system:<key>`). */
export const SYSTEM_TEMPLATE_PREFIX = "system:";

export function getSystemTemplate(key: string): SystemTemplate | undefined {
  return SYSTEM_TEMPLATES.find((t) => t.key === key);
}
