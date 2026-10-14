import { vocative } from "czech-vocative";

/**
 * Personalizace marketingových e-mailů — sdílené mezi náhledem v editoru,
 * testovacím odesláním a ostrým rozesláním kampaně, ať se chovají stejně.
 */

export interface TemplateVars {
  jmeno: string;
  email: string;
  /** Volitelný odkaz — např. náhled vizitky ke schválení (různý pro každé odeslání). */
  odkaz?: string;
}

/** Podporované placeholdery + popis a ukázková hodnota (pro náhled). */
export const TEMPLATE_PLACEHOLDERS: {
  token: string;
  label: string;
  sample: string;
}[] = [
  { token: "{{jmeno}}", label: "Oslovení kontaktu (křestní jméno v 5. pádě)", sample: "Jane" },
  { token: "{{email}}", label: "E-mail kontaktu", sample: "jan.novak@email.cz" },
  { token: "{{odkaz}}", label: "Odkaz (např. náhled vizitky)", sample: "https://nahled.solopixel.cz" },
];

/** Ukázková data pro náhled a test. */
export const SAMPLE_VARS: TemplateVars = {
  jmeno: "Jane",
  email: "jan.novak@email.cz",
  odkaz: "https://nahled.solopixel.cz",
};

/** Nahradí placeholdery v textu (předmět i HTML). */
export function personalizeTemplate(text: string, vars: TemplateVars): string {
  return text
    .replace(/\{\{jmeno\}\}/g, vars.jmeno)
    .replace(/\{\{email\}\}/g, vars.email)
    .replace(/\{\{odkaz\}\}/g, vars.odkaz ?? "");
}

/** Křestní jméno z celého jména. */
export function firstName(name: string): string {
  return (name || "").split(" ")[0] || name || "";
}

/** Křestní jméno v 5. pádě („Jana Nováková“ → „Jano“). Neznámé tvary vrátí beze změny. */
export function vocativeFirstName(name: string): string {
  const first = firstName(name).trim();
  if (!first) return "";
  try {
    return vocative(first) || first;
  } catch {
    return first;
  }
}

/** Kdo se v e-mailu oslovuje: osoba → její jméno, firma → kontaktní osoba (nebo nikdo). */
function personName(client: { kind?: string | null; name?: string | null; contactName?: string | null }): string {
  return client.kind === "company" ? (client.contactName ?? "") : (client.name ?? "");
}

/**
 * Oslovení v e-mailu bez jména firmy: ruční `greeting` u klienta (oprava
 * automatiky), jinak křestní jméno osoby v 5. pádě. Prázdné, když není koho
 * oslovit (firma bez kontaktní osoby) — šablona pak napíše jen „Dobrý den,“.
 */
export function personalGreeting(client: {
  kind?: string | null;
  name?: string | null;
  contactName?: string | null;
  greeting?: string | null;
}): string {
  return client.greeting?.trim() || vocativeFirstName(personName(client));
}

/**
 * Oslovení klienta v e-mailu ({{jmeno}}): jako `personalGreeting`; firma bez
 * kontaktní osoby → název firmy (šablony s {{jmeno}} oslovení potřebují).
 */
export function greetingName(client: {
  kind?: string | null;
  name?: string | null;
  contactName?: string | null;
  greeting?: string | null;
}): string {
  return personalGreeting(client) || (client.name ?? "");
}

/** Celé jméno člověka, se kterým komunikujeme: osoba → jméno, firma → kontaktní osoba (jinak název firmy). */
export function contactPersonName(client: {
  kind?: string | null;
  name?: string | null;
  contactName?: string | null;
}): string {
  if (client.kind === "company") return client.contactName || client.name || "";
  return client.name ?? "";
}
