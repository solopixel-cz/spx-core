import { z } from "zod";
import { FEEDBACK_REASONS } from "@/lib/web-feedback";

/** Volitelný text: ořízne mezery a řídicí znaky, prázdný řetězec = nevyplněno. */
const opt = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, max);
      return t ? t : undefined;
    });

const count = z
  .number()
  .nonnegative()
  .optional()
  .transform((v) => (v === undefined ? undefined : Math.round(v)));

/**
 * Odpověď z dotazu při odchodu z webu, jak ji posílá spx-web
 * (`pages/api/exit-feedback.ts`). Neznámá pole se tiše zahodí.
 */
export const webFeedbackSchema = z
  .object({
    reason: z.string().refine((r) => r in FEEDBACK_REASONS, "Neznámý důvod"),
    message: opt(1000),
    contact: opt(200),
    page: opt(200),
    device: z.enum(["desktop", "mobile"]).catch("desktop"),
    seconds: count,
    pages: count,
    utm_source: opt(200),
    utm_medium: opt(200),
    utm_campaign: opt(200),
    utm_content: opt(200),
    referrer: opt(200),
    landing_page: opt(200),
  })
  .refine((d) => d.reason !== "jine" || !!d.message, { message: "Chybí text", path: ["message"] });

export type WebFeedbackInput = z.infer<typeof webFeedbackSchema>;
