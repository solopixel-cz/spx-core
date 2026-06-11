import { z } from "zod";

/** Placeholder for Firestore Timestamp — validated as any at schema level, typed properly at runtime */
export const timestampSchema = z.any();

/** Common fields shared by all entities */
export const baseFields = {
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  createdBy: z.string(),
};
