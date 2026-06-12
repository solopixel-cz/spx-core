import { z } from "zod";
import { baseFields } from "./timestamp";

export const userSchema = z.object({
  ...baseFields,
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(["admin", "member", "sales"]),
  active: z.boolean(),
});

export type User = z.infer<typeof userSchema>;
