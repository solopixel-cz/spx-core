import { z } from "zod";

/**
 * Dodavatelské (fakturační) údaje — `settings/company`.
 * Zdroj hlavičky „dodavatel" na PDF faktuře a platebních údajů v e-mailu.
 * Zadavatel je neplátce DPH → `dic` prázdné, `vatNote` výchozí hláška.
 */
export const companySchema = z.object({
  name: z.string().min(1, "Zadejte název dodavatele"),
  address: z.string().min(1, "Zadejte adresu"),
  ico: z.string().optional(),
  dic: z.string().optional(),
  bankAccount: z.string().min(1, "Zadejte číslo účtu"),
  iban: z.string().optional(),
  email: z.string().email("Neplatný e-mail").optional().or(z.literal("")),
  phone: z.string().optional(),
  web: z.string().optional(),
  vatNote: z.string().optional(),
  invoiceFooter: z.string().optional(),
});

export type CompanyData = z.infer<typeof companySchema>;

export const DEFAULT_VAT_NOTE = "Nejsem plátce DPH.";
