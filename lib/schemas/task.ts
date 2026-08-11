import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

/** Interval opakování úkolu. `none` = jednorázový. */
export const TASK_RECURRENCES = ["none", "weekly", "monthly", "quarterly", "yearly"] as const;
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number];

export const taskRecurrenceLabels: Record<TaskRecurrence, string> = {
  none: "Neopakovat",
  weekly: "Týdně",
  monthly: "Měsíčně",
  quarterly: "Čtvrtletně",
  yearly: "Ročně",
};

export const taskSchema = z.object({
  ...baseFields,
  title: z.string().min(1),
  description: z.string().optional(),
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  ticketId: z.string().optional(),
  assigneeUid: z.string().min(1),
  dueAt: timestampSchema.optional(),
  status: z.enum(["open", "done"]),
  /** Kdy byl úkol odbaven (nastaveno při přechodu na `done`, smazáno při znovuotevření). */
  doneAt: timestampSchema.optional(),
  recurrence: z.enum(TASK_RECURRENCES).optional(),
  checklistTemplateId: z.string().optional(),
});

export type Task = z.infer<typeof taskSchema>;

export const taskFormSchema = z.object({
  title: z.string().min(1, "Titul je povinný"),
  description: z.string().optional(),
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  ticketId: z.string().optional(),
  assigneeUid: z.string().min(1, "Vyberte řešitele"),
  dueAt: z.string().optional(),
  status: z.enum(["open", "done"]),
  recurrence: z.enum(TASK_RECURRENCES).optional(),
});

export type TaskFormData = z.infer<typeof taskFormSchema>;
