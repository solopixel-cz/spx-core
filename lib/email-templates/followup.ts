/**
 * SoloPixel branded follow-up email template.
 * Druhý e-mail — pro prospekty, kteří první oslovení otevřeli, ale neklikli na demo.
 * Kratší, nižší bariéra, jeden konkrétní důvod a jediné CTA.
 * Fixed HTML design — only {{jmeno}} and {{odkaz}} are replaced at runtime.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderFollowupEmail(vars: {
  jmeno: string;
  odkaz: string;
}): { html: string; text: string } {
  const jmeno = escapeHtml(vars.jmeno);
  const odkaz = escapeHtml(vars.odkaz);

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="cs">
<head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>SoloPixel — vaše vizitka na 30 sekund</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <style type="text/css">
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { margin: 0; padding: 0; width: 100% !important; background: #F1F5F9; font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        a { color: #0F766E; text-decoration: underline; }
        @media only screen and (max-width:620px) {
            .container { width: 100% !important; }
            .px { padding-left: 24px !important; padding-right: 24px !important; }
            .h1 { font-size: 24px !important; line-height: 30px !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background:#F1F5F9;">
    <div style="display:none; font-size:1px; color:#F1F5F9; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;"> 30 sekund na mobilu a uvidíte přesně to, co uvidí váš klient. </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.06);">
                    <tr>
                        <td style="background:#0F1220; padding:24px 32px; border-bottom:3px solid #5DEAD4;" class="px">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="left" style="vertical-align:middle;"><a href="https://www.solopixel.cz/?utm_source=email&amp;utm_medium=followup&amp;utm_content=header-logo" style="text-decoration:none; color:#FFFFFF;"><img src="https://solopixel.cz/images/logo/logo-line-light.svg" width="160" height="32" alt="SoloPixel" style="display:block; border:0; outline:none; max-height:32px;" /></a></td>
                                    <td align="right" style="vertical-align:middle;"><span style="font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:11px; font-weight:700; letter-spacing:2px; color:#5DEAD4; text-transform:uppercase;">Pro poradce</span></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:40px 48px 8px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <h1 class="h1" style="margin:0 0 16px 0; font-size:26px; line-height:32px; font-weight:800; color:#0F172A; letter-spacing:-0.3px;"> Než to zapadne — 30 sekund. </h1>
                            <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#334155;"> Dobrý den, ${jmeno}, </p>
                            <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#334155;"> posílal jsem vám nedávno ukázku digitální vizitky pro finanční poradce. Vím, že den je nabitý a snadno to zapadne — tak jen krátce a k věci. </p>
                            <p style="margin:0 0 28px 0; font-size:16px; line-height:26px; color:#334155;"> Je to odkaz, který <strong style="color:#0F172A;">pošlete klientovi po schůzce</strong> — on si vás jedním ťuknutím uloží do telefonu a sám se ozve, když řeší hypotéku nebo penzi. Přesně to, co papírová vizitka neumí. </p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" align="center" style="padding:0 48px 8px 48px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="border-radius:10px; background:#5DEAD4;"><a href="${odkaz}" style="display:inline-block; padding:16px 32px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:16px; font-weight:700; color:#0F1220; text-decoration:none; border-radius:10px; letter-spacing:0.3px;"> Otevřít demo na mobilu → </a></td>
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
                        <td class="px" style="padding:0 48px 32px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <div style="background:#F8FAFC; border-radius:12px; padding:20px 24px; border-left:3px solid #5DEAD4;">
                                <p style="margin:0 0 6px 0; font-size:14px; line-height:22px; font-weight:700; color:#0F172A;"> Mrkněte na to očima klienta </p>
                                <p style="margin:0; font-size:14px; line-height:22px; color:#475569;"> Otevřete odkaz v mobilu, zkuste kalkulačku a napište AI asistentce. Za půl minuty víte, jestli to dává smysl — a jestli ne, nic se neděje. </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 32px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 12px 0; font-size:16px; line-height:26px; color:#334155;"> Kdyby vás cokoli zajímalo, stačí odpovědět na tenhle e-mail nebo zavolat — rád vám vizitku ukážu naživo na míru vašemu poradenství. </p>
                            <p style="margin:0; font-size:15px; line-height:24px; color:#475569;"><a href="mailto:hello@solopixel.cz" style="color:#0F766E; text-decoration:none; font-weight:600;">hello@solopixel.cz</a> &nbsp;·&nbsp; <a href="tel:+420774291077" style="color:#0F766E; text-decoration:none; font-weight:600;">+420 774 291 077</a></p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 40px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 4px 0; font-size:15px; line-height:22px; color:#0F172A;"> Hezký den<br /><strong style="color:#0F172A; font-weight:700;">Lukáš Kaleta</strong></p>
                            <p style="margin:0; font-size:13px; line-height:20px; color:#64748B;"> SoloPixel — váš digitální parťák </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#F8FAFC; padding:24px 48px; border-top:1px solid #E2E8F0;" class="px">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#94A3B8;"><strong style="color:#475569;">SoloPixel</strong> · Frýdek-Místek<br /><a href="mailto:hello@solopixel.cz" style="color:#0F766E; text-decoration:none;">hello@solopixel.cz</a> &nbsp;·&nbsp; <a href="tel:+420774291077" style="color:#0F766E; text-decoration:none;">+420 774 291 077</a> &nbsp;·&nbsp; <a href="https://www.solopixel.cz/?utm_source=email&amp;utm_medium=followup&amp;utm_content=footer-brand" style="color:#0F766E; text-decoration:none;">www.solopixel.cz</a><br /><br /><span style="color:#B6C0CC;">Tento e-mail jsme vám poslali jako finančnímu poradci v rámci nabídky našich služeb. Pokud nemáte zájem o další zprávy, odpovězte „NEMÁM ZÁJEM" a už se neozveme.</span></td>
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

  const text = `Dobrý den, ${vars.jmeno},

posílal jsem vám nedávno ukázku digitální vizitky pro finanční poradce. Vím, že den je nabitý a snadno to zapadne — tak jen krátce a k věci.

Je to odkaz, který pošlete klientovi po schůzce — on si vás jedním ťuknutím uloží do telefonu a sám se ozve, když řeší hypotéku nebo penzi. Přesně to, co papírová vizitka neumí.

Otevřít demo na mobilu: ${vars.odkaz}

Mrkněte na to očima klienta — zkuste kalkulačku, napište AI asistentce. Za půl minuty víte, jestli to dává smysl. A jestli ne, nic se neděje.

Kdyby vás cokoli zajímalo, stačí odpovědět na tenhle e-mail nebo zavolat — rád vám vizitku ukážu naživo.

hello@solopixel.cz · +420 774 291 077

Hezký den
Lukáš Kaleta
SoloPixel — váš digitální parťák

---
SoloPixel · Frýdek-Místek · www.solopixel.cz
Tento e-mail jsme vám poslali jako finančnímu poradci v rámci nabídky našich služeb.
Pokud nemáte zájem o další zprávy, odpovězte „NEMÁM ZÁJEM" a už se neozveme.`;

  return { html, text };
}

export const DEFAULT_FOLLOWUP_SUBJECT = "{{jmeno}}, ještě jednou — vaše vizitka na 30 sekund";
