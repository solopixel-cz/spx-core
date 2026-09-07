import { personalizeTemplate, type TemplateVars } from "./personalize";

export interface CompanyInfo {
  name?: string;
  address?: string;
  email?: string;
  web?: string;
  ico?: string;
}

/** Hrubý převod HTML na plain-text fallback (pro text/plain část e-mailu). */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<\/(p|div|tr|table|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function footerHtml(company: CompanyInfo, unsubscribeUrl: string): string {
  const identity = [company.name, company.address, company.ico ? `IČO ${company.ico}` : ""]
    .filter(Boolean)
    .join(" · ");
  return `
  <div style="max-width:600px;margin:16px auto 0;padding:16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
    ${identity ? `${identity}<br/>` : ""}
    Tento e-mail jste dostali jako kontakt v databázi ${company.name || "SoloPixel"}.
    <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Odhlásit odběr</a>
  </div>`;
}

function footerText(company: CompanyInfo, unsubscribeUrl: string): string {
  const identity = [company.name, company.address, company.ico ? `IČO ${company.ico}` : ""]
    .filter(Boolean)
    .join(", ");
  return `\n\n—\n${identity}\nOdhlásit odběr: ${unsubscribeUrl}`;
}

/** Vloží patičku před </body>, jinak ji připojí na konec. */
function injectBeforeBody(html: string, snippet: string): string {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${snippet}</body>`);
  }
  return html + snippet;
}

/**
 * Sestaví finální marketingový e-mail: personalizace, patička (identifikace
 * odesílatele + odhlášení) a plain-text varianta. Sdílené pro ostré odeslání
 * i testy, ať je náhled i realita konzistentní.
 */
export function composeMarketingEmail(opts: {
  html: string;
  subject: string;
  vars: TemplateVars;
  unsubscribeUrl: string;
  company: CompanyInfo;
}): { html: string; text: string; subject: string } {
  const pHtml = personalizeTemplate(opts.html, opts.vars);
  const pSubject = personalizeTemplate(opts.subject, opts.vars);
  const html = injectBeforeBody(pHtml, footerHtml(opts.company, opts.unsubscribeUrl));
  const text = htmlToText(pHtml) + footerText(opts.company, opts.unsubscribeUrl);
  return { html, text, subject: pSubject };
}
