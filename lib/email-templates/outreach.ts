/**
 * SoloPixel branded outreach email template.
 *
 * Editovatelný je jen obsahový text (headline, intro, popisek tlačítka, závěr)
 * a odkaz na vizitku — zbytek (branded rám, feature-karty, tip box, patička)
 * je fixní. Jméno a telefon v podpisu/patičce se propisují z přihlášeného
 * uživatele. Viz `outreach-content.ts`.
 */
import {
  type OutreachContent,
  withOutreachDefaults,
  DEFAULT_OUTREACH_CONTENT,
} from "./outreach-content";
import { stripHtml } from "@/lib/sanitize-html";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Statická patička — mění se jen jméno a telefon odesílatele. */
const STATIC_SENDER_NAME = "Lukáš Kaleta";
const STATIC_SENDER_PHONE = "+420 774 291 077";
const STATIC_SENDER_EMAIL = "hello@solopixel.cz";

export function renderOutreachEmail(vars: {
  jmeno: string;
  odkaz: string;
  content?: Partial<OutreachContent> | null;
  senderName?: string | null;
  senderPhone?: string | null;
}): { html: string; text: string } {
  const jmeno = escapeHtml(vars.jmeno);
  const odkaz = escapeHtml(vars.odkaz);

  const content = withOutreachDefaults(vars.content);
  const headline = escapeHtml(content.headline);
  const ctaLabel = escapeHtml(content.ctaLabel);
  // introHtml/closingHtml jsou už sanitizované (server) — vkládáme jako HTML.
  const introHtml = content.introHtml;
  const closingHtml = content.closingHtml;

  const senderName = escapeHtml((vars.senderName || STATIC_SENDER_NAME).trim());
  const senderPhone = (vars.senderPhone || STATIC_SENDER_PHONE).trim();
  const senderPhoneEsc = escapeHtml(senderPhone);
  const senderPhoneTel = senderPhone.replace(/\s/g, "");

  // Reference — hotové vizitky klientů (max 2, jen s platnou URL).
  const normalizeUrl = (u: string) => {
    const t = u.trim();
    if (!t) return "";
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  };
  const validReferences = content.references
    .map((r) => ({ label: r.label.trim(), url: normalizeUrl(r.url) }))
    .filter((r) => r.url)
    .slice(0, 2);
  // Ikona „otevřít v novém okně" (external-link) jako inline SVG.
  const extLinkIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F766E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-left:6px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/></svg>`;
  const referencesBlock =
    validReferences.length > 0
      ? `<tr>
                        <td class="px" style="padding:0 48px 32px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <div style="background:#F8FAFC; border-radius:12px; padding:20px 24px; border-left:3px solid #5DEAD4;">
                                <p style="margin:0 0 14px 0; font-size:14px; line-height:22px; color:#475569; text-align:center;">${escapeHtml(content.referencesText)}</p>
                                <div style="text-align:center; margin-top:4px;">${validReferences
                                  .map(
                                    (r) =>
                                      `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin:0 4px 8px 4px; padding:9px 16px; background:#FFFFFF; border:1px solid #5DEAD4; border-radius:8px; color:#0F766E; text-decoration:none; font-size:14px; font-weight:700;">${escapeHtml(r.label || "Otevřít vizitku")}${extLinkIcon}</a>`
                                  )
                                  .join("")}</div>
                            </div>
                        </td>
                    </tr>`
      : "";

  const featuresHeading = escapeHtml(content.featuresHeading);
  const featureRows = content.features
    .map((f, i) => {
      const last = i === content.features.length - 1;
      const pad = last ? "0 0 4px 0" : "0 0 18px 0";
      return `<tr><td style="padding:${pad}; vertical-align:top;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:32px; vertical-align:top; padding-top:2px;"><div style="width:24px; height:24px; background:#5DEAD4; border-radius:6px; text-align:center; line-height:24px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; font-weight:800; color:#0F1220;"> ${i + 1}</div></td><td style="vertical-align:top; padding-left:8px;"><strong style="color:#0F172A; font-weight:700; display:block; margin-bottom:4px;">${escapeHtml(f.title)}</strong><span style="color:#475569;">${escapeHtml(f.desc)}</span></td></tr></table></td></tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="cs">
<head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>SoloPixel — vizitka, co pracuje za vás</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <style type="text/css">
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { margin: 0; padding: 0; width: 100% !important; background: #F1F5F9; font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        a { color: #0F766E; text-decoration: underline; }
        .content p { margin: 0 0 16px 0; }
        .content p:last-child { margin-bottom: 0; }
        @media only screen and (max-width:620px) {
            .container { width: 100% !important; }
            .px { padding-left: 24px !important; padding-right: 24px !important; }
            .h1 { font-size: 26px !important; line-height: 32px !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background:#F1F5F9;">
    <div style="display:none; font-size:1px; color:#F1F5F9; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;"> Mrkněte na svou vizitku — za 60 sekund uvidíte, co všechno digitální vizitka zvládne. </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.06);">
                    <tr>
                        <td style="background:#0F1220; padding:24px 32px; border-bottom:3px solid #5DEAD4;" class="px">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="left" style="vertical-align:middle;"><a href="https://www.solopixel.cz/?utm_source=email&amp;utm_medium=outreach&amp;utm_content=header-logo" style="text-decoration:none; color:#FFFFFF;"><img src="https://www.solopixel.cz/images/logo/logo-line-light.svg" width="160" height="32" alt="SoloPixel" style="display:block; border:0; outline:none; max-height:32px;" /></a></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:40px 48px 8px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <h1 class="h1" style="margin:0 0 16px 0; font-size:28px; line-height:34px; font-weight:800; color:#0F172A; letter-spacing:-0.3px;"> ${headline} </h1>
                            <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#334155;"> Dobrý den, ${jmeno}, </p>
                            <div class="content" style="margin:0 0 28px 0; font-size:16px; line-height:26px; color:#334155;">${introHtml}</div>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" align="center" style="padding:0 48px 8px 48px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="border-radius:10px; background:#5DEAD4;"><a href="${odkaz}" style="display:inline-block; padding:16px 32px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:16px; font-weight:700; color:#0F1220; text-decoration:none; border-radius:10px; letter-spacing:0.3px;"> ${ctaLabel} </a></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" align="center" style="padding:0 48px 36px 48px;">
                            <p style="margin:8px 0 0 0; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; line-height:20px; color:#94A3B8; word-break:break-all;"><a href="${odkaz}" style="color:#94A3B8; text-decoration:none;">${odkaz}</a></p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 8px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 20px 0; font-size:11px; line-height:18px; font-weight:700; color:#64748B; letter-spacing:2px; text-transform:uppercase;"> ${featuresHeading} </p>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
                                ${featureRows}
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 32px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <div style="background:#F8FAFC; border-radius:12px; padding:20px 24px; border-left:3px solid #5DEAD4;">
                                <p style="margin:0 0 6px 0; font-size:14px; line-height:22px; font-weight:700; color:#0F172A;"> Tip: otevřete vizitku na mobilu </p>
                                <p style="margin:0; font-size:14px; line-height:22px; color:#475569;"> Tak ji uvidí i váš klient. Přidejte si ji na plochu, vyzkoušejte kalkulačku, napište Pixele. </p>
                            </div>
                        </td>
                    </tr>
                    ${referencesBlock}
                    <tr>
                        <td class="px" style="padding:0 48px 32px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <div class="content" style="margin:0 0 12px 0; font-size:16px; line-height:26px; color:#334155;">${closingHtml}</div>
                            <p style="margin:0; font-size:15px; line-height:24px; color:#475569;"><a href="mailto:${STATIC_SENDER_EMAIL}" style="color:#0F766E; text-decoration:none; font-weight:600;">${STATIC_SENDER_EMAIL}</a> &nbsp;·&nbsp; <a href="tel:${senderPhoneTel}" style="color:#0F766E; text-decoration:none; font-weight:600;">${senderPhoneEsc}</a></p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 40px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 4px 0; font-size:15px; line-height:22px; color:#0F172A;"> Hezký den<br /><strong style="color:#0F172A; font-weight:700;">${senderName}</strong></p>
                            <p style="margin:0; font-size:13px; line-height:20px; color:#64748B;"> SoloPixel — váš digitální parťák </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#F8FAFC; padding:24px 48px; border-top:1px solid #E2E8F0;" class="px">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#94A3B8;"><strong style="color:#475569;">SoloPixel</strong> · Frýdek-Místek<br /><a href="mailto:${STATIC_SENDER_EMAIL}" style="color:#0F766E; text-decoration:none;">${STATIC_SENDER_EMAIL}</a> &nbsp;·&nbsp; <a href="tel:${senderPhoneTel}" style="color:#0F766E; text-decoration:none;">${senderPhoneEsc}</a> &nbsp;·&nbsp; <a href="https://www.solopixel.cz/?utm_source=email&amp;utm_medium=outreach&amp;utm_content=footer-brand" style="color:#0F766E; text-decoration:none;">www.solopixel.cz</a><br /><br /><span style="color:#B6C0CC;">Tento e-mail jsme vám poslali jako finančnímu poradci v rámci nabídky našich služeb. Pokud nemáte zájem o další zprávy, odpovězte „NEMÁM ZÁJEM" a už se neozveme.</span></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

  // Plain-text varianta — z obsahu (prose zbavíme HTML).
  const introText = stripHtml(introHtml);
  const closingText = stripHtml(closingHtml);
  const text = `Dobrý den, ${vars.jmeno},

${introText}

Prohlédněte si vizitku: ${vars.odkaz}

${content.featuresHeading}
${content.features.map((f, i) => `${i + 1}. ${f.title} — ${f.desc}`).join("\n")}

Tip: otevřete vizitku na mobilu — tak ji uvidí i váš klient.
${
  validReferences.length > 0
    ? `\n${content.referencesText}\n${validReferences.map((r) => `- ${r.label || "Vizitka"}: ${r.url}`).join("\n")}\n`
    : ""
}
${closingText}

${STATIC_SENDER_EMAIL} · ${senderPhone}

Hezký den
${vars.senderName || STATIC_SENDER_NAME}
SoloPixel — váš digitální parťák

---
SoloPixel · Frýdek-Místek · www.solopixel.cz
Tento e-mail jsme vám poslali jako finančnímu poradci v rámci nabídky našich služeb.
Pokud nemáte zájem o další zprávy, odpovězte „NEMÁM ZÁJEM" a už se neozveme.`;

  return { html, text };
}

export const DEFAULT_OUTREACH_SUBJECT = "{{jmeno}}, takhle dnes vypadá vizitka, co pracuje za vás";

// Re-export pro pohodlí volajících.
export { DEFAULT_OUTREACH_CONTENT };
export type { OutreachContent };
