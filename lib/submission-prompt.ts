const SUBMISSION_PROMPT_INTRO = `Na základě následujících podkladů od finančního poradce vytvoř obsah jeho digitální vizitky SoloPixel (profil, bio, sekce služeb a zaměření). Vycházej výhradně z uvedených údajů, nic si nedomýšlej. Co není vyplněné, vynech.`;

interface SubmissionData {
  fullName: string;
  email: string;
  phone?: string;
  companyId?: string;
  companyName?: string;
  officeAddress?: string;
  city?: string;
  whatsapp?: string;
  motto?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  website?: string;
  referenceUrl?: string;
  wantsCareerTab?: boolean;
  specialization?: string;
  yearsOfExperience?: number;
  clientCount?: number;
  cnbExams: string[];
  focusAreas: string[];
  clientTypes: string[];
  bio?: string;
  reasons: string[];
  primaryLanguage?: string;
  availableLanguages: string[];
  customDomain?: string;
  profileImageUrl?: string;
}

export function buildSubmissionPrompt(submission: SubmissionData): string {
  const lines: string[] = [SUBMISSION_PROMPT_INTRO, ""];

  function addField(label: string, value: string | undefined) {
    if (value) lines.push(`**${label}:** ${value}`);
  }

  // Kontakt (bez IČO)
  const contactFields: [string, string | undefined][] = [
    ["Jméno", submission.fullName],
    ["E-mail", submission.email],
    ["Telefon", submission.phone],
    ["WhatsApp", submission.whatsapp],
    ["Společnost", submission.companyName],
    ["Adresa", submission.officeAddress],
    ["Město", submission.city],
  ];
  if (contactFields.some(([, v]) => v)) {
    lines.push("## Kontakt");
    for (const [label, value] of contactFields) addField(label, value);
    lines.push("");
  }

  // Profese
  const profeseFields: [string, string | undefined][] = [
    ["Specializace", submission.specialization],
    ["Praxe (roky)", submission.yearsOfExperience?.toString()],
    ["Počet klientů", submission.clientCount?.toString()],
    ["ČNB zkoušky", submission.cnbExams.join(", ") || undefined],
    ["Zaměření", submission.focusAreas.join(", ") || undefined],
    ["Typy klientů", submission.clientTypes.join(", ") || undefined],
  ];
  if (profeseFields.some(([, v]) => v)) {
    lines.push("## Profese");
    for (const [label, value] of profeseFields) addField(label, value);
    lines.push("");
  }

  // Profil
  const hasBio = !!submission.bio;
  const profileFields: [string, string | undefined][] = [
    ["Motto", submission.motto],
    ["Důvody", submission.reasons.join("; ") || undefined],
    ["Hlavní jazyk", submission.primaryLanguage],
    ["Další jazyky", submission.availableLanguages.join(", ") || undefined],
  ];
  if (hasBio || profileFields.some(([, v]) => v)) {
    lines.push("## Profil");
    if (hasBio) {
      lines.push(`**Bio:**`);
      lines.push(submission.bio!);
    }
    for (const [label, value] of profileFields) addField(label, value);
    lines.push("");
  }

  // Sociální sítě a reference
  const socialFields: [string, string | undefined][] = [
    ["Instagram", submission.instagram],
    ["LinkedIn", submission.linkedin],
    ["Facebook", submission.facebook],
    ["Web", submission.website],
    ["Reference", submission.referenceUrl],
    ["Zájem o sekci Spolupráce", submission.wantsCareerTab ? "Ano" : undefined],
  ];
  if (socialFields.some(([, v]) => v)) {
    lines.push("## Sociální sítě a reference");
    for (const [label, value] of socialFields) addField(label, value);
    lines.push("");
  }

  // Vizitka
  const vizitkaFields: [string, string | undefined][] = [
    ["Vlastní doména", submission.customDomain],
    ["Profilová fotka", submission.profileImageUrl],
  ];
  if (vizitkaFields.some(([, v]) => v)) {
    lines.push("## Vizitka");
    for (const [label, value] of vizitkaFields) addField(label, value);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
