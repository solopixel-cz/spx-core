import { z } from "zod";
import { timestampSchema } from "./timestamp";

/**
 * Nový vnořený tvar podkladů (`schemaVersion: 2`) — zdroj pravdy je kontrakt
 * ve webovém zadání `spx-web/spec/assign/zadani-formular-prestavba.md`.
 */
export const cardSubmissionSchema = z.object({
  schemaVersion: z.literal(2).optional(),
  token: z.string().min(1),
  basic: z.object({
    fullName: z.string().min(1),
    ico: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email(),
    companyBrand: z.string().optional(),
    customDomain: z.string().optional(),
    hasDomain: z.enum(["ano", "ne"]).optional(),
    region: z.string().optional(),
  }),
  social: z
    .object({
      youtube: z.string().optional(),
      instagram: z.string().optional(),
      tiktok: z.string().optional(),
      facebook: z.string().optional(),
      custom: z
        .array(z.object({ nazev: z.string(), odkaz: z.string() }))
        .optional(),
    })
    .optional(),
  services: z
    .object({
      whatIDo: z.string().optional(),
      topServices: z.string().optional(),
      mainAction: z.enum(["zavolat", "poptavka", "termin", "jine"]).optional(),
      mainActionNote: z.string().optional(),
    })
    .optional(),
  about: z.object({ text: z.string().optional() }).optional(),
  pixela: z
    .object({
      tone: z.enum(["profesionalni", "pratelska", "energicka", "humor"]).optional(),
      address: z.enum(["vykani", "tykani"]).optional(),
      ownWords: z.string().optional(),
    })
    .optional(),
  profileImageUrl: z.string().optional(),
  createdAt: timestampSchema,
  processedAt: timestampSchema.optional(),
  processedBy: z.string().optional(),
});

export type CardSubmission = z.infer<typeof cardSubmissionSchema>;

/**
 * Starší plochý tvar podkladů (bez `schemaVersion`) — jen pro typovou jistotu
 * při čtení historických záznamů. Nové záznamy používají `cardSubmissionSchema`.
 */
export const legacyCardSubmissionSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  officeAddress: z.string().optional(),
  specialization: z.string().optional(),
  city: z.string().optional(),
  primaryLanguage: z.string().optional(),
  availableLanguages: z.array(z.string()).optional(),
  customDomain: z.string().optional(),
  reasons: z.array(z.string()).optional(),
  cnbExams: z.array(z.string()).optional(),
  whatsapp: z.string().optional(),
  motto: z.string().optional(),
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  website: z.string().optional(),
  referenceUrl: z.string().optional(),
  wantsCareerTab: z.boolean().optional(),
  bio: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  clientCount: z.number().optional(),
  focusAreas: z.array(z.string()).optional(),
  clientTypes: z.array(z.string()).optional(),
  profileImageUrl: z.string().optional(),
  token: z.string().min(1),
  createdAt: timestampSchema,
  processedAt: timestampSchema.optional(),
  processedBy: z.string().optional(),
});

export type LegacyCardSubmission = z.infer<typeof legacyCardSubmissionSchema>;
