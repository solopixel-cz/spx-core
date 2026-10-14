/**
 * SoloPixel branded pozvánka do SoloPixel HUB (spx-hub).
 * Fixed HTML design — only {{jmeno}} and {{odkaz}} are replaced at runtime.
 * {{odkaz}} = přihlašovací stránka hubu s předvyplněným e-mailem (ne magic
 * link — ten po čase vyprší, pozvánka musí fungovat i za týden).
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function step(n: number, title: string, body: string, last = false): string {
  return `<tr><td style="padding:0 0 ${last ? 4 : 18}px 0; vertical-align:top;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:32px; vertical-align:top; padding-top:2px;"><div style="width:24px; height:24px; background:#5DEAD4; border-radius:6px; text-align:center; line-height:24px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; font-weight:800; color:#0F1220;"> ${n}</div></td><td style="vertical-align:top; padding-left:8px;"><strong style="color:#0F172A; font-weight:700; display:block; margin-bottom:4px;">${title}</strong><span style="color:#475569;">${body}</span></td></tr></table></td></tr>`;
}

export function renderHubInviteEmail(vars: {
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
    <title>Váš SoloPixel HUB je připravený</title>
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
            .h1 { font-size: 26px !important; line-height: 32px !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background:#F1F5F9;">
    <div style="display:none; font-size:1px; color:#F1F5F9; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;"> Váš SoloPixel HUB je připravený. Přihlášení je bez hesla. </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.06);">
                    <tr>
                        <td style="background:#0F1220; padding:24px 32px; border-bottom:3px solid #5DEAD4;" class="px">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="left" style="vertical-align:middle;"><a href="https://www.solopixel.cz/?utm_source=email&amp;utm_medium=hub-invite&amp;utm_content=header-logo" style="text-decoration:none; color:#FFFFFF;"><img src="https://solopixel.cz/images/logo/logo-line-light.svg" width="160" height="32" alt="SoloPixel" style="display:block; border:0; outline:none; max-height:32px;" /></a></td>
                                    <td align="right" style="vertical-align:middle;"><span style="font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:11px; font-weight:700; letter-spacing:2px; color:#5DEAD4; text-transform:uppercase;">SoloPixel HUB</span></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:40px 48px 8px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <h1 class="h1" style="margin:0 0 16px 0; font-size:28px; line-height:34px; font-weight:800; color:#0F172A; letter-spacing:-0.3px;"> Váš SoloPixel HUB<br />je připravený. </h1>
                            <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#334155;"> Dobrý den, ${jmeno}, </p>
                            <p style="margin:0 0 12px 0; font-size:16px; line-height:26px; color:#334155;"> zřídili jsme vám přístup do SoloPixel HUB. Na jednom místě v něm najdete: </p>
                            <ul style="margin:0 0 16px 0; padding:0 0 0 20px; font-size:16px; line-height:26px; color:#334155;">
                                <li style="margin:0 0 8px 0;"><strong style="color:#0F172A;">Přehled</strong> vaší vizitky</li>
                                <li style="margin:0 0 8px 0;"><strong style="color:#0F172A;">Fakturaci</strong>: vaše služby a faktury ke stažení v PDF s QR platbou</li>
                                <li style="margin:0 0 8px 0;"><strong style="color:#0F172A;">Statistiky</strong> návštěv vizitky, pokud je máte aktivní</li>
                                <li style="margin:0 0 8px 0;"><strong style="color:#0F172A;">Pomoc</strong>, když si s něčím nebudete vědět rady</li>
                            </ul>
                            <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#334155;"> Do HUB budeme postupně přidávat další užitečné funkce. </p>
                            <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#334155;"> Na mobilu si HUB můžete přidat na plochu a otevírat ho jako aplikaci. </p>
                            <p style="margin:0 0 28px 0; font-size:16px; line-height:26px; color:#334155;"> Přihlášení je <strong style="color:#0F172A;">bez hesla</strong>, stačí váš e-mail. </p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" align="center" style="padding:0 48px 8px 48px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="border-radius:10px; background:#5DEAD4;"><a href="${odkaz}" style="display:inline-block; padding:16px 32px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:16px; font-weight:700; color:#0F1220; text-decoration:none; border-radius:10px; letter-spacing:0.3px;"> Vstoupit do SoloPixel HUB → </a></td>
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
                            <p style="margin:0 0 20px 0; font-size:11px; line-height:18px; font-weight:700; color:#64748B; letter-spacing:2px; text-transform:uppercase;"> Jak se přihlásit </p>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
                                ${step(1, "Otevřete SoloPixel HUB", "Tlačítkem výše. E-mail už tam budete mít vyplněný.")}
                                ${step(2, "Klikněte na „Poslat odkaz“", "Do pár vteřin vám přijde e-mail s odkazem a kódem pro přihlášení.")}
                                ${step(3, "Klikněte na odkaz, nebo opište kód", "Kód se hodí na mobilu, když se e-mail otevře v jiné aplikaci. Příště to uděláte stejně, žádné heslo si nemusíte pamatovat.", true)}
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 32px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 12px 0; font-size:16px; line-height:26px; color:#334155;"> Něco nefunguje nebo vám v HUB něco chybí? <strong style="color:#0F172A;">Stačí odepsat na tento e-mail</strong>. </p>
                            <p style="margin:0; font-size:15px; line-height:24px; color:#475569;"><a href="mailto:hello@solopixel.cz" style="color:#0F766E; text-decoration:none; font-weight:600;">hello@solopixel.cz</a> &nbsp;·&nbsp; <a href="tel:+420774291077" style="color:#0F766E; text-decoration:none; font-weight:600;">+420 774 291 077</a></p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 40px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 4px 0; font-size:15px; line-height:22px; color:#0F172A;"> Hodně klientů přejeme<br /><strong style="color:#0F172A; font-weight:700;">Lukáš Kaleta</strong></p>
                            <p style="margin:0; font-size:13px; line-height:20px; color:#64748B;"> SoloPixel, váš digitální parťák </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#F8FAFC; padding:24px 48px; border-top:1px solid #E2E8F0;" class="px">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#94A3B8;"><strong style="color:#475569;">SoloPixel</strong> · Frýdek-Místek<br /><a href="mailto:hello@solopixel.cz" style="color:#0F766E; text-decoration:none;">hello@solopixel.cz</a> &nbsp;·&nbsp; <a href="tel:+420774291077" style="color:#0F766E; text-decoration:none;">+420 774 291 077</a> &nbsp;·&nbsp; <a href="https://www.solopixel.cz/?utm_source=email&amp;utm_medium=hub-invite&amp;utm_content=footer-brand" style="color:#0F766E; text-decoration:none;">www.solopixel.cz</a><br /><br /><span style="color:#B6C0CC;">Tento e-mail jste dostali, protože používáte digitální vizitku SoloPixel.</span></td>
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

zřídili jsme vám přístup do SoloPixel HUB. Na jednom místě v něm najdete:
- Přehled vaší vizitky
- Fakturaci: vaše služby a faktury ke stažení v PDF s QR platbou
- Statistiky návštěv vizitky, pokud je máte aktivní
- Pomoc, když si s něčím nebudete vědět rady

Do HUB budeme postupně přidávat další užitečné funkce.

Na mobilu si HUB můžete přidat na plochu a otevírat ho jako aplikaci.

Přihlášení je bez hesla, stačí váš e-mail:
${vars.odkaz}

Jak se přihlásit:
1. Otevřete SoloPixel HUB odkazem výše. E-mail už tam budete mít vyplněný.
2. Klikněte na „Poslat odkaz“. Do pár vteřin vám přijde e-mail s odkazem a kódem pro přihlášení.
3. Klikněte na odkaz, nebo opište kód. Příště to uděláte stejně, žádné heslo si nemusíte pamatovat.

Něco nefunguje nebo vám v HUB něco chybí? Stačí odepsat na tento e-mail.

hello@solopixel.cz · +420 774 291 077

Hodně klientů přejeme
Lukáš Kaleta
SoloPixel, váš digitální parťák

---
SoloPixel · Frýdek-Místek · www.solopixel.cz
Tento e-mail jste dostali, protože používáte digitální vizitku SoloPixel.`;

  return { html, text };
}

export const DEFAULT_HUB_INVITE_SUBJECT = "{{jmeno}}, váš SoloPixel HUB je připravený";
