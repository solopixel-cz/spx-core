/**
 * SoloPixel branded card-delivery email template.
 * Sent to a client when their finished (live) digital business card is handed over.
 * Fixed HTML design — only {{jmeno}} and {{odkaz}} are replaced at runtime.
 * {{odkaz}} = the client's LIVE card URL (https://{instance.domain}), not the demo.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderDeliveryEmail(vars: {
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
    <title>Vaše vizitka je hotová — SoloPixel</title>
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
    <div style="display:none; font-size:1px; color:#F1F5F9; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;"> Vaše digitální vizitka je připravená — tady je, plus pár tipů, jak ji používat. </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.06);">
                    <tr>
                        <td style="background:#0F1220; padding:24px 32px; border-bottom:3px solid #5DEAD4;" class="px">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="left" style="vertical-align:middle;"><a href="https://www.solopixel.cz/?utm_source=email&amp;utm_medium=delivery&amp;utm_content=header-logo" style="text-decoration:none; color:#FFFFFF;"><img src="https://solopixel.cz/images/logo/logo-line-light.svg" width="160" height="32" alt="SoloPixel" style="display:block; border:0; outline:none; max-height:32px;" /></a></td>
                                    <td align="right" style="vertical-align:middle;"><span style="font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:11px; font-weight:700; letter-spacing:2px; color:#5DEAD4; text-transform:uppercase;">Hotovo ✓</span></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:40px 48px 8px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <h1 class="h1" style="margin:0 0 16px 0; font-size:28px; line-height:34px; font-weight:800; color:#0F172A; letter-spacing:-0.3px;"> Vaše vizitka<br />je hotová. </h1>
                            <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#334155;"> Dobrý den, ${jmeno}, </p>
                            <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#334155;"> máme to — vaše digitální vizitka je připravená a od teď žije na vlastní adrese. Otevřete si ji, projděte a vezměte ji rovnou na první schůzku. </p>
                            <p style="margin:0 0 28px 0; font-size:16px; line-height:26px; color:#334155;"> Níže najdete pár tipů, jak si ji během minuty přidáte do telefonu, jak ji sdílet a jak z ní vytěžit maximum. </p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" align="center" style="padding:0 48px 8px 48px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="border-radius:10px; background:#5DEAD4;"><a href="${odkaz}" style="display:inline-block; padding:16px 32px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:16px; font-weight:700; color:#0F1220; text-decoration:none; border-radius:10px; letter-spacing:0.3px;"> Otevřít moji vizitku → </a></td>
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
                            <p style="margin:0 0 20px 0; font-size:11px; line-height:18px; font-weight:700; color:#64748B; letter-spacing:2px; text-transform:uppercase;"> Jak s vizitkou začít </p>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
                                <tr><td style="padding:0 0 18px 0; vertical-align:top;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:32px; vertical-align:top; padding-top:2px;"><div style="width:24px; height:24px; background:#5DEAD4; border-radius:6px; text-align:center; line-height:24px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; font-weight:800; color:#0F1220;"> 1</div></td><td style="vertical-align:top; padding-left:8px;"><strong style="color:#0F172A; font-weight:700; display:block; margin-bottom:4px;">Přidejte si ji na plochu telefonu</strong><span style="color:#475569;">Pak se chová jako appka — jeden tap a máte ji po ruce.<br /><strong style="color:#334155; font-weight:600;">iPhone (Safari):</strong> ťukněte na ikonu <em>Sdílet</em> → <em>Přidat na plochu</em>.<br /><strong style="color:#334155; font-weight:600;">Android (Chrome):</strong> menu ⋮ → <em>Přidat na plochu</em> / <em>Instalovat aplikaci</em>.</span></td></tr></table></td></tr>
                                <tr><td style="padding:0 0 18px 0; vertical-align:top;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:32px; vertical-align:top; padding-top:2px;"><div style="width:24px; height:24px; background:#5DEAD4; border-radius:6px; text-align:center; line-height:24px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; font-weight:800; color:#0F1220;"> 2</div></td><td style="vertical-align:top; padding-left:8px;"><strong style="color:#0F172A; font-weight:700; display:block; margin-bottom:4px;">Sdílejte ji, jak se vám hodí</strong><span style="color:#475569;">Pošlete odkaz v SMS, WhatsAppu nebo e-mailu, ukažte klientovi QR kód z telefonu, dejte odkaz do podpisu e-mailu a do bia na sociálních sítích.</span></td></tr></table></td></tr>
                                <tr><td style="padding:0 0 18px 0; vertical-align:top;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:32px; vertical-align:top; padding-top:2px;"><div style="width:24px; height:24px; background:#5DEAD4; border-radius:6px; text-align:center; line-height:24px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; font-weight:800; color:#0F1220;"> 3</div></td><td style="vertical-align:top; padding-left:8px;"><strong style="color:#0F172A; font-weight:700; display:block; margin-bottom:4px;">Předejte ji hned na schůzce</strong><span style="color:#475569;">Ukažte vizitku klientovi a ať si ji uloží — zůstane mu v telefonu napořád, na rozdíl od papírové, co skončí v šuplíku.</span></td></tr></table></td></tr>
                                <tr><td style="padding:0 0 4px 0; vertical-align:top;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:32px; vertical-align:top; padding-top:2px;"><div style="width:24px; height:24px; background:#5DEAD4; border-radius:6px; text-align:center; line-height:24px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; font-weight:800; color:#0F1220;"> 4</div></td><td style="vertical-align:top; padding-left:8px;"><strong style="color:#0F172A; font-weight:700; display:block; margin-bottom:4px;">Držte ji aktuální</strong><span style="color:#475569;">Změnil se telefon, fotka, nabídka služeb? Napište nám a doplníme to — klient pak vždy vidí aktuální údaje.</span></td></tr></table></td></tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 32px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <div style="background:#F8FAFC; border-radius:12px; padding:20px 24px; border-left:3px solid #5DEAD4;">
                                <p style="margin:0 0 6px 0; font-size:14px; line-height:22px; font-weight:700; color:#0F172A;"> Tip: nechte Pixelu pracovat za vás </p>
                                <p style="margin:0; font-size:14px; line-height:22px; color:#475569;"> Vaše AI asistentka odpovídá klientům i mimo pracovní dobu. Čím víc jí dodáme podkladů, tím líp odpovídá — kdykoli budete chtít něco doplnit, dejte vědět. </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 32px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 12px 0; font-size:16px; line-height:26px; color:#334155;"> Něco nesedí nebo chcete ještě něco doladit? <strong style="color:#0F172A;">Stačí odepsat na tento e-mail</strong> — vizitka je vaše a rádi ji vyladíme k dokonalosti. </p>
                            <p style="margin:0; font-size:15px; line-height:24px; color:#475569;"><a href="mailto:hello@solopixel.cz" style="color:#0F766E; text-decoration:none; font-weight:600;">hello@solopixel.cz</a> &nbsp;·&nbsp; <a href="tel:+420774291077" style="color:#0F766E; text-decoration:none; font-weight:600;">+420 774 291 077</a></p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 40px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 4px 0; font-size:15px; line-height:22px; color:#0F172A;"> Hodně klientů přejeme<br /><strong style="color:#0F172A; font-weight:700;">Lukáš Kaleta</strong></p>
                            <p style="margin:0; font-size:13px; line-height:20px; color:#64748B;"> SoloPixel — váš digitální parťák </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#F8FAFC; padding:24px 48px; border-top:1px solid #E2E8F0;" class="px">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#94A3B8;"><strong style="color:#475569;">SoloPixel</strong> · Frýdek-Místek<br /><a href="mailto:hello@solopixel.cz" style="color:#0F766E; text-decoration:none;">hello@solopixel.cz</a> &nbsp;·&nbsp; <a href="tel:+420774291077" style="color:#0F766E; text-decoration:none;">+420 774 291 077</a> &nbsp;·&nbsp; <a href="https://www.solopixel.cz/?utm_source=email&amp;utm_medium=delivery&amp;utm_content=footer-brand" style="color:#0F766E; text-decoration:none;">www.solopixel.cz</a><br /><br /><span style="color:#B6C0CC;">Tento e-mail jste dostali, protože jsme pro vás připravili digitální vizitku SoloPixel.</span></td>
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

máme to — vaše digitální vizitka je připravená a od teď žije na vlastní adrese:
${vars.odkaz}

Otevřete si ji, projděte a vezměte ji rovnou na první schůzku. Tady je pár tipů, jak s ní začít:

1. Přidejte si ji na plochu telefonu — pak se chová jako appka, jeden tap a máte ji po ruce.
   - iPhone (Safari): ťukněte na Sdílet → Přidat na plochu.
   - Android (Chrome): menu ⋮ → Přidat na plochu / Instalovat aplikaci.

2. Sdílejte ji, jak se vám hodí — pošlete odkaz v SMS, WhatsAppu nebo e-mailu, ukažte klientovi QR kód z telefonu, dejte odkaz do podpisu e-mailu a do bia na sociálních sítích.

3. Předejte ji hned na schůzce — ať si ji klient uloží. Zůstane mu v telefonu napořád, na rozdíl od papírové.

4. Držte ji aktuální — změnil se telefon, fotka, nabídka služeb? Napište nám a doplníme to.

Tip: nechte Pixelu pracovat za vás — vaše AI asistentka odpovídá klientům i mimo pracovní dobu. Kdykoli budete chtít doplnit podklady, dejte vědět.

Něco nesedí nebo chcete něco doladit? Stačí odepsat na tento e-mail — vizitka je vaše a rádi ji vyladíme.

hello@solopixel.cz · +420 774 291 077

Hodně klientů přejeme
Lukáš Kaleta
SoloPixel — váš digitální parťák

---
SoloPixel · Frýdek-Místek · www.solopixel.cz
Tento e-mail jste dostali, protože jsme pro vás připravili digitální vizitku SoloPixel.`;

  return { html, text };
}

export const DEFAULT_DELIVERY_SUBJECT = "{{jmeno}}, vaše vizitka je hotová";
