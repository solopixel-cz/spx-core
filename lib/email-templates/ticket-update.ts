/**
 * E-mail klientovi ke Zpětné vazbě z HUBu (tickets se `source: 'hub'`):
 * odpověď týmu, nebo změna stavu (čekáme na vás, hotovo). Celé vlákno
 * si klient přečte a odpoví v HUBu, odkaz vede rovnou na ticket.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type TicketUpdateKind = "reply" | "waiting_client" | "resolved";

const COPY: Record<TicketUpdateKind, { subject: string; heading: string; lead: string; cta: string }> = {
  reply: {
    subject: "Odpověď k vašemu požadavku",
    heading: "Máte od nás odpověď",
    lead: "K vašemu požadavku jsme napsali odpověď:",
    cta: "Zobrazit a odpovědět",
  },
  waiting_client: {
    subject: "Potřebujeme od vás doplnit informace",
    heading: "Potřebujeme od vás doplnit informace",
    lead: "Abychom mohli pokračovat, potřebujeme od vás ještě něco doplnit. Podrobnosti najdete v HUBu.",
    cta: "Doplnit v HUBu",
  },
  resolved: {
    subject: "Hotovo: váš požadavek je vyřešený",
    heading: "Hotovo",
    lead: "Váš požadavek jsme vyřešili. Když něco nesedí, napište nám přímo k němu v HUBu.",
    cta: "Zobrazit požadavek",
  },
};

export function renderTicketUpdateEmail(vars: {
  kind: TicketUpdateKind;
  ticketTitle: string;
  /** Text odpovědi (jen u `reply`). */
  message?: string;
  authorName: string;
  link: string;
}): { subject: string; html: string; text: string } {
  const copy = COPY[vars.kind];
  const title = escapeHtml(vars.ticketTitle);
  const link = escapeHtml(vars.link);
  const quote = vars.kind === "reply" && vars.message
    ? `<div style="margin:0 0 24px;padding:16px;border-left:3px solid #5DEAD4;background:#F8FAFC;border-radius:8px;font-size:15px;line-height:1.55;color:#0F172A;white-space:pre-wrap">${escapeHtml(vars.message)}</div>
        <p style="margin:0 0 24px;font-size:13px;color:#64748B">${escapeHtml(vars.authorName)}, SoloPixel</p>`
    : "";

  const html = `<!doctype html>
<html lang="cs">
  <body style="margin:0;padding:24px;background:#F1F5F9;font-family:'Montserrat',Helvetica,Arial,sans-serif;color:#0F172A">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px">
      <tr><td style="padding:32px">
        <p style="margin:0 0 8px;font-size:13px;color:#64748B">${title}</p>
        <h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(copy.heading)}</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#475569">${escapeHtml(copy.lead)}</p>
        ${quote}
        <p style="margin:0">
          <a href="${link}" style="display:inline-block;padding:12px 22px;background:#0F1220;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">${escapeHtml(copy.cta)}</a>
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    vars.ticketTitle,
    "",
    copy.heading,
    copy.lead,
    ...(vars.kind === "reply" && vars.message ? ["", vars.message, "", `${vars.authorName}, SoloPixel`] : []),
    "",
    `${copy.cta}: ${vars.link}`,
  ].join("\n");

  return { subject: `${copy.subject}: ${vars.ticketTitle}`, html, text };
}
