import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

/** Stav jednorázové zakázky. */
export const projectStatuses = ["inquiry", "in_progress", "delivered", "cancelled"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

/** Rozpracované = ještě nedodané a nezrušené. */
export const OPEN_PROJECT_STATUSES: ProjectStatus[] = ["inquiry", "in_progress"];

/** Jednorázová zakázka klienta (např. marketingový prospekt) — kolekce `projects`. */
export const projectSchema = z.object({
  ...baseFields,
  clientId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(projectStatuses),
  price: z.number().nonnegative().optional(),
  invoiceId: z.string().optional(),
  dueAt: timestampSchema.optional(),
  deliveredAt: timestampSchema.optional(),
});

export type Project = z.infer<typeof projectSchema>;

/** Formulář zakázky (create i edit). Datum jako YYYY-MM-DD, prázdné = bez termínu. */
export const projectFormSchema = z.object({
  title: z.string().min(1, "Zadejte název zakázky"),
  description: z.string().optional(),
  status: z.enum(projectStatuses),
  price: z.number({ message: "Zadejte číslo" }).nonnegative("Cena nemůže být záporná").optional(),
  dueAt: z.string().optional(),
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;
