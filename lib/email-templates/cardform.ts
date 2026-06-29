/**
 * SoloPixel branded "card-form" invitation email template.
 * Sent to a new client to ask them to fill in the data we need to build their
 * digital business card (the vizitka-formulář on www.solopixel.cz).
 * Fixed HTML design — only {{jmeno}} and {{odkaz}} are replaced at runtime.
 * {{odkaz}} = the tokenized form URL (CARD_FORM_BASE_URL + token).
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderCardFormEmail(vars: {
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
    <title>Pojďme vytvořit vaši vizitku — SoloPixel</title>
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
    <div style="display:none; font-size:1px; color:#F1F5F9; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;"> Vyplňte krátký formulář a my z něj postavíme vaši digitální vizitku. </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.06);">
                    <tr>
                        <td style="background:#0F1220; padding:24px 32px; border-bottom:3px solid #5DEAD4;" class="px">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="left" style="vertical-align:middle;"><a href="https://www.solopixel.cz/?utm_source=email&amp;utm_medium=cardform&amp;utm_content=header-logo" style="text-decoration:none; color:#FFFFFF;"><img src="https://solopixel.cz/images/logo/logo-line-light.svg" width="160" height="32" alt="SoloPixel" style="display:block; border:0; outline:none; max-height:32px;" /></a></td>
                                    <td align="right" style="vertical-align:middle;"><span style="font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:11px; font-weight:700; letter-spacing:2px; color:#5DEAD4; text-transform:uppercase;">Podklady</span></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:40px 48px 8px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <h1 class="h1" style="margin:0 0 16px 0; font-size:28px; line-height:34px; font-weight:800; color:#0F172A; letter-spacing:-0.3px;"> Pojďme vytvořit<br />vaši vizitku. </h1>
                            <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#334155;"> Dobrý den, ${jmeno}, </p>
                            <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#334155;"> těší nás, že do toho jdeme společně. Abychom vám mohli postavit digitální vizitku na míru, potřebujeme od vás pár podkladů — vyplníte je v krátkém formuláři. </p>
                            <p style="margin:0 0 28px 0; font-size:16px; line-height:26px; color:#334155;"> Zabere to jen pár minut a o zbytek se postaráme my. </p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" align="center" style="padding:0 48px 8px 48px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="border-radius:10px; background:#5DEAD4;"><a href="${odkaz}" style="display:inline-block; padding:16px 32px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:16px; font-weight:700; color:#0F1220; text-decoration:none; border-radius:10px; letter-spacing:0.3px;"> Vyplnit formulář → </a></td>
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
                            <p style="margin:0 0 20px 0; font-size:11px; line-height:18px; font-weight:700; color:#64748B; letter-spacing:2px; text-transform:uppercase;"> Co si připravit </p>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
                                <tr><td style="padding:0 0 18px 0; vertical-align:top;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:32px; vertical-align:top; padding-top:2px;"><div style="width:24px; height:24px; background:#5DEAD4; border-radius:6px; text-align:center; line-height:24px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; font-weight:800; color:#0F1220;"> 1</div></td><td style="vertical-align:top; padding-left:8px;"><strong style="color:#0F172A; font-weight:700; display:block; margin-bottom:4px;">Vaše fotka</strong><span style="color:#475569;">Profilová fotka v dobré kvalitě — ideálně na světlém pozadí. Klidně rovnou z telefonu.</span></td></tr></table></td></tr>
                                <tr><td style="padding:0 0 18px 0; vertical-align:top;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:32px; vertical-align:top; padding-top:2px;"><div style="width:24px; height:24px; background:#5DEAD4; border-radius:6px; text-align:center; line-height:24px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; font-weight:800; color:#0F1220;"> 2</div></td><td style="vertical-align:top; padding-left:8px;"><strong style="color:#0F172A; font-weight:700; display:block; margin-bottom:4px;">Kontaktní údaje</strong><span style="color:#475569;">Telefon, e-mail, web a profily na sociálních sítích, které chcete mít na vizitce.</span></td></tr></table></td></tr>
                                <tr><td style="padding:0 0 4px 0; vertical-align:top;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:32px; vertical-align:top; padding-top:2px;"><div style="width:24px; height:24px; background:#5DEAD4; border-radius:6px; text-align:center; line-height:24px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; font-weight:800; color:#0F1220;"> 3</div></td><td style="vertical-align:top; padding-left:8px;"><strong style="color:#0F172A; font-weight:700; display:block; margin-bottom:4px;">Pár slov o vás</strong><span style="color:#475569;">Čím se zabýváte a komu pomáháte. Nemusí to být dokonalé — text vám rádi pomůžeme doladit.</span></td></tr></table></td></tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 32px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <div style="background:#F8FAFC; border-radius:12px; padding:20px 24px; border-left:3px solid #5DEAD4;">
                                <p style="margin:0 0 6px 0; font-size:14px; line-height:22px; font-weight:700; color:#0F172A;"> Nemáte všechno po ruce? </p>
                                <p style="margin:0; font-size:14px; line-height:22px; color:#475569;"> Nevadí — vyplňte, co máte, a zbytek doplníme společně. Důležité je začít. </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 32px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 12px 0; font-size:16px; line-height:26px; color:#334155;"> Máte otázku nebo si nevíte rady? <strong style="color:#0F172A;">Stačí odepsat na tento e-mail</strong> — rádi vám pomůžeme. </p>
                            <p style="margin:0; font-size:15px; line-height:24px; color:#475569;"><a href="mailto:hello@solopixel.cz" style="color:#0F766E; text-decoration:none; font-weight:600;">hello@solopixel.cz</a> &nbsp;·&nbsp; <a href="tel:+420774291077" style="color:#0F766E; text-decoration:none; font-weight:600;">+420 774 291 077</a></p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 40px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 4px 0; font-size:15px; line-height:22px; color:#0F172A;"> Těšíme se na spolupráci<br /><strong style="color:#0F172A; font-weight:700;">Lukáš Kaleta</strong></p>
                            <p style="margin:0; font-size:13px; line-height:20px; color:#64748B;"> SoloPixel — váš digitální parťák </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#F8FAFC; padding:24px 48px; border-top:1px solid #E2E8F0;" class="px">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#94A3B8;"><strong style="color:#475569;">SoloPixel</strong> · Frýdek-Místek<br /><a href="mailto:hello@solopixel.cz" style="color:#0F766E; text-decoration:none;">hello@solopixel.cz</a> &nbsp;·&nbsp; <a href="tel:+420774291077" style="color:#0F766E; text-decoration:none;">+420 774 291 077</a> &nbsp;·&nbsp; <a href="https://www.solopixel.cz/?utm_source=email&amp;utm_medium=cardform&amp;utm_content=footer-brand" style="color:#0F766E; text-decoration:none;">www.solopixel.cz</a><br /><br /><span style="color:#B6C0CC;">Tento e-mail jste dostali, protože pro vás připravujeme digitální vizitku SoloPixel.</span></td>
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

těší nás, že do toho jdeme společně. Abychom vám mohli postavit digitální vizitku na míru, potřebujeme od vás pár podkladů — vyplníte je v krátkém formuláři:
${vars.odkaz}

Zabere to jen pár minut a o zbytek se postaráme my.

Co si připravit:

1. Vaše fotka — profilová fotka v dobré kvalitě, ideálně na světlém pozadí. Klidně rovnou z telefonu.

2. Kontaktní údaje — telefon, e-mail, web a profily na sociálních sítích, které chcete mít na vizitce.

3. Pár slov o vás — čím se zabýváte a komu pomáháte. Nemusí to být dokonalé, text vám rádi pomůžeme doladit.

Nemáte všechno po ruce? Nevadí — vyplňte, co máte, a zbytek doplníme společně. Důležité je začít.

Máte otázku nebo si nevíte rady? Stačí odepsat na tento e-mail — rádi vám pomůžeme.

hello@solopixel.cz · +420 774 291 077

Těšíme se na spolupráci
Lukáš Kaleta
SoloPixel — váš digitální parťák

---
SoloPixel · Frýdek-Místek · www.solopixel.cz
Tento e-mail jste dostali, protože pro vás připravujeme digitální vizitku SoloPixel.`;

  return { html, text };
}

export const DEFAULT_CARDFORM_SUBJECT = "{{jmeno}}, pojďme vytvořit vaši vizitku — vyplňte krátký formulář";
