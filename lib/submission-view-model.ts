/**
 * Jednotný view model podkladů (fáze 30).
 *
 * Web zapisuje do `card-submissions/{token}` buď nový vnořený payload
 * (`schemaVersion: 2`), nebo starší plochý (legacy) tvar. `normalizeSubmission`
 * oba tvary převede na jeden view model, který konzumuje detail i AI prompt.
 */

export interface CustomSocial {
  nazev: string;
  odkaz: string;
}

/** Zobrazitelný tvar podkladu — společný pro nový (v2) i legacy záznam. */
export interface SubmissionView {
  // Kontakt
  fullName?: string;
  ico?: string;
  phone?: string;
  email?: string;
  companyBrand?: string;
  customDomain?: string;
  hasDomain?: "ano" | "ne"; // 'ano' = vlastní doména, 'ne' = přání
  region?: string;
  // Sociální sítě
  youtube?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  customSocial: CustomSocial[];
  // Co dělá
  whatIDo?: string;
  topServices?: string;
  mainAction?: string; // kód, viz MAIN_ACTION_LABELS
  mainActionNote?: string;
  // O mně
  aboutText?: string;
  // Pixela
  tone?: string; // kód, viz TONE_LABELS
  address?: string; // kód, viz ADDRESS_LABELS
  ownWords?: string;
  // Poznámky — jen nosič pro doplňková pole legacy záznamů (v2 sekci nemá)
  notes?: string;
  // Vizitka
  profileImageUrl?: string;
}

/** Surová data z Firestore — superset obou tvarů, vše volitelné. */
export interface RawSubmission {
  schemaVersion?: number;
  profileImageUrl?: string;
  // v2 — vnořené sekce
  basic?: {
    fullName?: string;
    ico?: string;
    phone?: string;
    email?: string;
    companyBrand?: string;
    customDomain?: string;
    hasDomain?: "ano" | "ne";
    region?: string;
  };
  social?: {
    youtube?: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    custom?: { nazev?: string; odkaz?: string }[];
  };
  services?: {
    whatIDo?: string;
    topServices?: string;
    mainAction?: string;
    mainActionNote?: string;
  };
  about?: { text?: string };
  pixela?: { tone?: string; address?: string; ownWords?: string };
  // legacy — plochá pole
  fullName?: string;
  email?: string;
  phone?: string;
  companyId?: string;
  companyName?: string;
  officeAddress?: string;
  specialization?: string;
  city?: string;
  primaryLanguage?: string;
  availableLanguages?: string[];
  customDomain?: string;
  reasons?: string[];
  cnbExams?: string[];
  bio?: string;
  yearsOfExperience?: number;
  clientCount?: number;
  focusAreas?: string[];
  clientTypes?: string[];
  whatsapp?: string;
  motto?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  website?: string;
  referenceUrl?: string;
  wantsCareerTab?: boolean;
}

// --- Lidské popisky kódů ---------------------------------------------------

export const MAIN_ACTION_LABELS: Record<string, string> = {
  zavolat: "Zavolat mi",
  poptavka: "Poslat poptávku",
  termin: "Domluvit termín",
  jine: "Jiné",
};

export const TONE_LABELS: Record<string, string> = {
  profesionalni: "Profesionální a věcná",
  pratelska: "Přátelská a lidská",
  energicka: "Energická a dynamická",
  humor: "S humorem",
};

export const ADDRESS_LABELS: Record<string, string> = {
  vykani: "Vykání",
  tykani: "Tykání",
};

/** Kód → lidský text; neznámý kód vrátí beze změny. */
export function label(map: Record<string, string>, code?: string): string | undefined {
  if (!code) return undefined;
  return map[code] ?? code;
}

/**
 * Popisek pole domény podle příznaku `hasDomain`.
 * `long` = delší varianta pro AI Markdown.
 */
export function domainLabel(hasDomain?: string, opts?: { long?: boolean }): string {
  if (hasDomain === "ano") return "Doména (vlastní)";
  if (hasDomain === "ne") return opts?.long ? "Doména (zatím nemá, přání)" : "Doména (přání)";
  return "Vlastní doména";
}

// --- Normalizace -----------------------------------------------------------

function normalizeV2(raw: RawSubmission): SubmissionView {
  const b = raw.basic ?? {};
  const s = raw.social ?? {};
  const sv = raw.services ?? {};
  const a = raw.about ?? {};
  const p = raw.pixela ?? {};

  return {
    fullName: b.fullName,
    ico: b.ico,
    phone: b.phone,
    email: b.email,
    companyBrand: b.companyBrand,
    customDomain: b.customDomain,
    hasDomain: b.hasDomain,
    region: b.region,
    youtube: s.youtube,
    instagram: s.instagram,
    tiktok: s.tiktok,
    facebook: s.facebook,
    customSocial: (s.custom ?? [])
      .filter((c) => c && (c.nazev || c.odkaz))
      .map((c) => ({ nazev: c.nazev ?? "", odkaz: c.odkaz ?? "" })),
    whatIDo: sv.whatIDo,
    topServices: sv.topServices,
    mainAction: sv.mainAction,
    mainActionNote: sv.mainActionNote,
    aboutText: a.text,
    tone: p.tone,
    address: p.address,
    ownWords: p.ownWords,
    profileImageUrl: raw.profileImageUrl,
  };
}

function normalizeLegacy(raw: RawSubmission): SubmissionView {
  // Sítě bez v2 ekvivalentu přesuneme do custom, ať se neztratí.
  const customSocial: CustomSocial[] = [];
  if (raw.whatsapp) customSocial.push({ nazev: "WhatsApp", odkaz: raw.whatsapp });
  if (raw.linkedin) customSocial.push({ nazev: "LinkedIn", odkaz: raw.linkedin });
  if (raw.website) customSocial.push({ nazev: "Web", odkaz: raw.website });
  if (raw.referenceUrl) customSocial.push({ nazev: "Reference", odkaz: raw.referenceUrl });

  // Legacy pole bez v2 domova sesypeme do poznámek, ať se v detailu neztratí.
  const noteLines: string[] = [];
  const addNote = (labelText: string, value?: string) => {
    if (value) noteLines.push(`${labelText}: ${value}`);
  };
  addNote("Adresa", raw.officeAddress);
  addNote("Hlavní jazyk", raw.primaryLanguage);
  addNote("Další jazyky", (raw.availableLanguages ?? []).join(", ") || undefined);
  addNote("Praxe (roky)", raw.yearsOfExperience?.toString());
  addNote("Počet klientů", raw.clientCount?.toString());
  addNote("ČNB zkoušky", (raw.cnbExams ?? []).join(", ") || undefined);
  addNote("Typy klientů", (raw.clientTypes ?? []).join(", ") || undefined);
  addNote("Důvody", (raw.reasons ?? []).join("; ") || undefined);
  if (raw.wantsCareerTab) noteLines.push("Zájem o sekci Spolupráce: Ano");

  return {
    fullName: raw.fullName,
    ico: raw.companyId,
    phone: raw.phone,
    email: raw.email,
    companyBrand: raw.companyName,
    customDomain: raw.customDomain,
    region: raw.city,
    instagram: raw.instagram,
    facebook: raw.facebook,
    customSocial,
    whatIDo: raw.specialization,
    topServices: (raw.focusAreas ?? []).join(", ") || undefined,
    aboutText: raw.bio,
    ownWords: raw.motto,
    notes: noteLines.join("\n") || undefined,
    profileImageUrl: raw.profileImageUrl,
  };
}

/** Převede surová Firestore data (v2 i legacy) na jednotný view model. */
export function normalizeSubmission(raw: RawSubmission): SubmissionView {
  if (raw?.schemaVersion === 2) return normalizeV2(raw);
  return normalizeLegacy(raw);
}
