/**
 * Personalizace marketingových e-mailů — sdílené mezi náhledem v editoru,
 * testovacím odesláním a ostrým rozesláním kampaně, ať se chovají stejně.
 */

export interface TemplateVars {
  jmeno: string;
  email: string;
}

/** Podporované placeholdery + popis a ukázková hodnota (pro náhled). */
export const TEMPLATE_PLACEHOLDERS: {
  token: string;
  label: string;
  sample: string;
}[] = [
  { token: "{{jmeno}}", label: "Křestní jméno kontaktu", sample: "Jan" },
  { token: "{{email}}", label: "E-mail kontaktu", sample: "jan.novak@email.cz" },
];

/** Ukázková data pro náhled a test. */
export const SAMPLE_VARS: TemplateVars = {
  jmeno: "Jan",
  email: "jan.novak@email.cz",
};

/** Nahradí placeholdery v textu (předmět i HTML). */
export function personalizeTemplate(text: string, vars: TemplateVars): string {
  return text
    .replace(/\{\{jmeno\}\}/g, vars.jmeno)
    .replace(/\{\{email\}\}/g, vars.email);
}

/** Křestní jméno z celého jména. */
export function firstName(name: string): string {
  return (name || "").split(" ")[0] || name || "";
}
