import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

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
});

export type TaskFormData = z.infer<typeof taskFormSchema>;
