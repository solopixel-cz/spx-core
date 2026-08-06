import {
  type SubmissionView,
  MAIN_ACTION_LABELS,
  TONE_LABELS,
  ADDRESS_LABELS,
  label,
  domainLabel,
} from "./submission-view-model";

const SUBMISSION_PROMPT_INTRO = `Na základě následujících podkladů od klienta vytvoř obsah jeho digitální vizitky SoloPixel (profil, text „O mně", sekce služeb a hlavní akce). Vycházej výhradně z uvedených údajů, nic si nedomýšlej. Klíčový je text „O mně" a požadovaný tón, jakým má vizitka (Pixela) působit — drž se ho v celém obsahu. Co není vyplněné, vynech.`;

export function buildSubmissionPrompt(submission: SubmissionView): string {
  const lines: string[] = [SUBMISSION_PROMPT_INTRO, ""];

  function addField(labelText: string, value: string | undefined) {
    if (value) lines.push(`**${labelText}:** ${value}`);
  }

  function addBlock(labelText: string, value: string | undefined) {
    if (value) {
      lines.push(`**${labelText}:**`);
      lines.push(value);
    }
  }

  // ## Kontakt — bez IČO!
  const contactFields: [string, string | undefined][] = [
    ["Jméno", submission.fullName],
    ["Telefon", submission.phone],
    ["E-mail", submission.email],
    ["Firma / značka", submission.companyBrand],
    ["Region", submission.region],
    [domainLabel(submission.hasDomain, { long: true }), submission.customDomain],
  ];
  if (contactFields.some(([, v]) => v)) {
    lines.push("## Kontakt");
    for (const [labelText, value] of contactFields) addField(labelText, value);
    lines.push("");
  }

  // ## Sociální sítě
  const socialFields: [string, string | undefined][] = [
    ["YouTube", submission.youtube],
    ["Instagram", submission.instagram],
    ["TikTok", submission.tiktok],
    ["Facebook", submission.facebook],
  ];
  const customSocial = submission.customSocial.filter((c) => c.nazev || c.odkaz);
  if (socialFields.some(([, v]) => v) || customSocial.length > 0) {
    lines.push("## Sociální sítě");
    for (const [labelText, value] of socialFields) addField(labelText, value);
    for (const c of customSocial) {
      addField(c.nazev || "Odkaz", c.odkaz);
    }
    lines.push("");
  }

  // ## Co dělá
  const hasServices =
    submission.whatIDo || submission.topServices || submission.mainAction;
  if (hasServices) {
    lines.push("## Co dělá");
    addBlock("Čím se živí", submission.whatIDo);
    addBlock("Hlavní 3 služby", submission.topServices);
    const mainAction = label(MAIN_ACTION_LABELS, submission.mainAction);
    if (mainAction) {
      const note = submission.mainActionNote ? ` (${submission.mainActionNote})` : "";
      lines.push(`**Hlavní akce:** ${mainAction}${note}`);
    }
    lines.push("");
  }

  // ## O mně
  if (submission.aboutText) {
    lines.push("## O mně");
    lines.push(submission.aboutText);
    lines.push("");
  }

  // ## Jak má působit Pixela
  const tone = label(TONE_LABELS, submission.tone);
  const address = label(ADDRESS_LABELS, submission.address);
  if (tone || address || submission.ownWords) {
    lines.push("## Jak má působit Pixela");
    addField("Tón", tone);
    addField("Oslovení", address);
    addBlock("Vlastními slovy", submission.ownWords);
    lines.push("");
  }

  // ## Poznámky — jen legacy záznamy (v2 sekci nemá)
  if (submission.notes) {
    lines.push("## Poznámky");
    lines.push(submission.notes);
    lines.push("");
  }

  // ## Vizitka
  if (submission.profileImageUrl) {
    lines.push("## Vizitka");
    addField("Profilová fotka", submission.profileImageUrl);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
