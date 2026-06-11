import { z } from "zod";
import { baseFields } from "./timestamp";

export const activitySchema = z.object({
  ...baseFields,
  entityType: z.enum(["client", "lead", "ticket", "invoice"]),
  entityId: z.string().min(1),
  kind: z.enum(["note", "status_change", "call", "email", "system"]),
  text: z.string().min(1),
  actorUid: z.string().min(1),
});

export type Activity = z.infer<typeof activitySchema>;
