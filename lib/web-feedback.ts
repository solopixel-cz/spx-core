import type { DocumentSnapshot } from "firebase-admin/firestore";
import type { Attribution } from "@/lib/attribution";

/**
 * Zpětná vazba z dotazu při odchodu z webu (`webFeedback`, spx-web ExitSurvey).
 * Důvody a jejich texty odpovídají webu (`web.exit.reasons`, `pages/api/exit-feedback.ts`).
 */
export const FEEDBACK_REASONS: Record<string, string> = {
  rozhlizim: "Zatím se jen rozhlížím",
  cena: "Cena mi teď nesedí",
  obor: "Nevím, jestli se to hodí pro můj obor",
  mam: "Vizitku nebo web už mám",
  jine: "Něco jiného",
};

export function reasonLabel(reason: string): string {
  return FEEDBACK_REASONS[reason] ?? reason;
}

export interface WebFeedbackRow {
  id: string;
  reason: string;
  message: string | null;
  contact: string | null;
  page: string | null;
  device: "desktop" | "mobile";
  seconds: number | null;
  pages: number | null;
  attribution: Attribution | null;
  prospectId: string | null;
  createdAt: string | null;
}

export function feedbackFromDoc(doc: DocumentSnapshot): WebFeedbackRow {
  const d = doc.data() ?? {};
  const created = d.createdAt as { toDate?: () => Date } | undefined;
  return {
    id: doc.id,
    reason: (d.reason as string) ?? "jine",
    message: (d.message as string) ?? null,
    contact: (d.contact as string) ?? null,
    page: (d.page as string) ?? null,
    device: d.device === "mobile" ? "mobile" : "desktop",
    seconds: typeof d.seconds === "number" ? d.seconds : null,
    pages: typeof d.pages === "number" ? d.pages : null,
    attribution: (d.attribution as Attribution) ?? null,
    prospectId: (d.prospectId as string) ?? null,
    createdAt: created?.toDate ? created.toDate().toISOString() : null,
  };
}

/** Doba na webu čitelně: „45 s", „3 min 12 s". */
export function durationLabel(seconds: number | null): string {
  if (seconds === null) return "–";
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
