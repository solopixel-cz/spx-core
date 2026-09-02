/**
 * Editovatelný obsah oslovovacího e-mailu.
 *
 * Jen tyto části textu jsou editovatelné v detailu prospekta (per-prospekt).
 * Zbytek e-mailu (branded rám, feature-karty, tip box, patička) je fixní.
 * `introHtml` a `closingHtml` jsou rich-text (povolené jen <p>,<br>,<strong>,
 * <b>,<em>,<i>,<u>,<a>) — před uložením se sanitizují na serveru.
 * `greeting`, `headline`, `ctaLabel` jsou prostý text (escapuje se při renderu).
 */
export interface OutreachFeature {
  /** Krátký titulek bodu (prostý text). */
  title: string;
  /** Popis bodu (prostý text). */
  desc: string;
}

export interface OutreachContent {
  /** Oslovení v 5. pádu — nahradí {{jmeno}} v předmětu i těle. */
  greeting: string;
  /** Nadpis (H1). */
  headline: string;
  /** Úvodní odstavce (rich text). */
  introHtml: string;
  /** Popisek tlačítka. */
  ctaLabel: string;
  /** Nadpis sekce s body (prostý text). */
  featuresHeading: string;
  /** Body sekce — číslují se automaticky podle pořadí. */
  features: OutreachFeature[];
  /** Závěrečný odstavec před podpisem (rich text). */
  closingHtml: string;
}

export const MAX_OUTREACH_FEATURES = 8;

export const DEFAULT_OUTREACH_CONTENT: OutreachContent = {
  greeting: "",
  headline: "Vizitka, která pracuje i po schůzce.",
  introHtml:
    "<p>z každé schůzky odcházíte s podanou rukou — ale co po vás zůstane klientovi v telefonu? Papírová vizitka skončí v šuplíku do druhého dne.</p>" +
    "<p>Postavili jsme pro finanční poradce <strong>digitální vizitku</strong>, která klientovi zůstane po ruce, sama sbírá kontakty a odpovídá za vás i ve tři ráno. Nejlíp to uvidíte na vlastní vizitce — projděte si ji jako klient.</p>",
  ctaLabel: "Prohlédnout vizitku →",
  featuresHeading: "Na co se u vizitky mrknout (60 sekund)",
  features: [
    {
      title: "Profil, který prodává",
      desc: "O vás, vaše služby a reference na jednom místě — vždy aktuální, vždy po ruce.",
    },
    {
      title: "Kalkulačky, co zaujmou",
      desc: "Hypotéka, penze, investice. Klient si sám spočítá orientační čísla.",
    },
    {
      title: "AI asistentka Pixela",
      desc: "Odpovídá na dotazy klientů 24/7 z vaší knowledge base.",
    },
    {
      title: "Sběr kontaktů a rezervace",
      desc: "Klient zanechá číslo nebo si vybere termín schůzky.",
    },
  ],
  closingHtml:
    "<p>Pokud vás to zaujme, ozvěte se — <strong>vaši vizitku máme hotovou do pár dní</strong>. Rád vám ji ukážu na míru vašemu poradenství.</p>",
};

/** Doplní chybějící pole výchozími hodnotami. */
export function withOutreachDefaults(
  content?: Partial<OutreachContent> | null
): OutreachContent {
  const features =
    Array.isArray(content?.features) && content.features.length > 0
      ? content.features.map((f) => ({
          title: f?.title ?? "",
          desc: f?.desc ?? "",
        }))
      : DEFAULT_OUTREACH_CONTENT.features;

  return {
    greeting: content?.greeting?.trim() || DEFAULT_OUTREACH_CONTENT.greeting,
    headline: content?.headline?.trim() || DEFAULT_OUTREACH_CONTENT.headline,
    introHtml: content?.introHtml?.trim() || DEFAULT_OUTREACH_CONTENT.introHtml,
    ctaLabel: content?.ctaLabel?.trim() || DEFAULT_OUTREACH_CONTENT.ctaLabel,
    featuresHeading:
      content?.featuresHeading?.trim() || DEFAULT_OUTREACH_CONTENT.featuresHeading,
    features,
    closingHtml: content?.closingHtml?.trim() || DEFAULT_OUTREACH_CONTENT.closingHtml,
  };
}
