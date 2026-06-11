import { z } from "zod";
import { baseFields, timestampSchema } from "./timestamp";

export const taskSchema = z.object({
  ...baseFields,
  title: z.string().min(1),
  description: z.string().optional(),
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  assigneeUid: z.string().min(1),
  dueAt: timestampSchema.optional(),
  status: z.enum(["open", "done"]),
  checklistTemplateId: z.string().optional(),
});

export type Task = z.infer<typeof taskSchema>;
