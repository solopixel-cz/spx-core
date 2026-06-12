import { z } from "zod";
import { timestampSchema } from "./timestamp";

export const cardSubmissionSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  companyId: z.string().optional(),
  officeAddress: z.string().optional(),
  specialization: z.string().optional(),
  city: z.string().optional(),
  primaryLanguage: z.string().optional(),
  availableLanguages: z.array(z.string()),
  customDomain: z.string().optional(),
  reasons: z.array(z.string()),
  cnbExams: z.array(z.string()),
  bio: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  clientCount: z.number().optional(),
  focusAreas: z.array(z.string()),
  clientTypes: z.array(z.string()),
  profileImageUrl: z.string().optional(),
  token: z.string().min(1),
  createdAt: timestampSchema,
  processedAt: timestampSchema.optional(),
  processedBy: z.string().optional(),
});

export type CardSubmission = z.infer<typeof cardSubmissionSchema>;
