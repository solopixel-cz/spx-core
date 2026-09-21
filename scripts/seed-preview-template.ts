/**
 * Vytvoří (idempotentně) email-marketingovou šablonu „Vizitka k náhledu ke schválení"
 * v kolekci `emailTemplates`. Šablona používá placeholdery {{jmeno}} a {{odkaz}},
 * které se personalizují při odeslání z detailu klienta (akce „Poslat e-mail").
 *
 * Pevné doc ID `preview-vizitka-schvaleni` → opakované spuštění přepíše obsah,
 * nevznikají duplicity. Po vytvoření lze šablonu dál upravovat v UI
 * (Email marketing → Šablony).
 *
 * Míří na STEJNOU databázi jako aplikace (respektuje NEXT_PUBLIC_FIRESTORE_DATABASE_ID).
 *
 * Spuštění:
 *   set -a && source .env.local && set +a && npx tsx scripts/seed-preview-template.ts
 */
import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const DOC_ID = "preview-vizitka-schvaleni";
const NAME = "Vizitka k náhledu ke schválení";
const SUBJECT = "{{jmeno}}, návrh vaší vizitky je připravený 👀";

function db() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Chybí FIREBASE_* údaje — načti .env.local (set -a && source .env.local && set +a)."
      );
    }
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount),
    });
  }
  const dbId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
  return dbId ? getFirestore(dbId) : getFirestore();
}

const HTML = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="cs">
<head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Návrh vaší vizitky je připravený</title>
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
    <div style="display:none; font-size:1px; color:#F1F5F9; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;"> Připravili jsme první návrh vaší digitální vizitky, mrkněte a dejte vědět. </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.06);">
                    <tr>
                        <td style="background:#0F1220; padding:24px 32px; border-bottom:3px solid #5DEAD4;" class="px">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="left" style="vertical-align:middle;"><a href="https://www.solopixel.cz/?utm_source=email&amp;utm_medium=preview&amp;utm_content=header-logo" style="text-decoration:none; color:#FFFFFF;"><img src="https://solopixel.cz/images/logo/logo-line-light.svg" width="160" height="32" alt="SoloPixel" style="display:block; border:0; outline:none; max-height:32px;" /></a></td>
                                    <td align="right" style="vertical-align:middle;"><span style="font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:11px; font-weight:700; letter-spacing:2px; color:#5DEAD4; text-transform:uppercase;">Návrh ✎</span></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:40px 48px 8px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <h1 class="h1" style="margin:0 0 16px 0; font-size:28px; line-height:34px; font-weight:800; color:#0F172A; letter-spacing:-0.3px;"> Návrh vaší vizitky<br />je připravený. </h1>
                            <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#334155;"> Dobrý den, {{jmeno}}, </p>
                            <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#334155;"> připravili jsme pro vás první návrh digitální vizitky. Mrkněte na něj v klidu z telefonu i z počítače, ať vidíte, jak bude působit na vaše klienty.</p>
                            <p style="margin:0 0 28px 0; font-size:16px; line-height:26px; color:#334155;"> Tohle je zatím <strong style="color:#0F172A;">náhled ke schválení</strong>, ještě není zveřejněný. Řekněte nám, jestli všechno sedí, nebo co upravit. </p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" align="center" style="padding:0 48px 8px 48px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="border-radius:10px; background:#5DEAD4;"><a href="{{odkaz}}" style="display:inline-block; padding:16px 32px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:16px; font-weight:700; color:#0F1220; text-decoration:none; border-radius:10px; letter-spacing:0.3px;"> Prohlédnout návrh → </a></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" align="center" style="padding:0 48px 36px 48px;">
                            <p style="margin:8px 0 0 0; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; line-height:20px; color:#94A3B8; word-break:break-all;"><a href="{{odkaz}}" style="color:#94A3B8; text-decoration:none;">{{odkaz}}</a></p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 8px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 20px 0; font-size:11px; line-height:18px; font-weight:700; color:#64748B; letter-spacing:2px; text-transform:uppercase;"> Na co se při náhledu zaměřit </p>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
                                <tr><td style="padding:0 0 18px 0; vertical-align:top;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:32px; vertical-align:top; padding-top:2px;"><div style="width:24px; height:24px; background:#5DEAD4; border-radius:6px; text-align:center; line-height:24px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; font-weight:800; color:#0F1220;"> 1</div></td><td style="vertical-align:top; padding-left:8px;"><strong style="color:#0F172A; font-weight:700; display:block; margin-bottom:4px;">Údaje a kontakty</strong><span style="color:#475569;">Jméno, telefon, e-mail, odkazy na sítě. Sedí všechno a je to aktuální?</span></td></tr></table></td></tr>
                                <tr><td style="padding:0 0 18px 0; vertical-align:top;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:32px; vertical-align:top; padding-top:2px;"><div style="width:24px; height:24px; background:#5DEAD4; border-radius:6px; text-align:center; line-height:24px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; font-weight:800; color:#0F1220;"> 2</div></td><td style="vertical-align:top; padding-left:8px;"><strong style="color:#0F172A; font-weight:700; display:block; margin-bottom:4px;">Texty a fotka</strong><span style="color:#475569;">Popis služeb, představení, profilová fotka. Chcete něco přeformulovat nebo vyměnit?</span></td></tr></table></td></tr>
                                <tr><td style="padding:0 0 4px 0; vertical-align:top;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:32px; vertical-align:top; padding-top:2px;"><div style="width:24px; height:24px; background:#5DEAD4; border-radius:6px; text-align:center; line-height:24px; font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:13px; font-weight:800; color:#0F1220;"> 3</div></td><td style="vertical-align:top; padding-left:8px;"><strong style="color:#0F172A; font-weight:700; display:block; margin-bottom:4px;">Celkový dojem</strong><span style="color:#475569;">Barvy, styl, pořadí sekcí. Vystihuje to vás a to, jak chcete působit?</span></td></tr></table></td></tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 32px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <div style="background:#F8FAFC; border-radius:12px; padding:20px 24px; border-left:3px solid #5DEAD4;">
                                <p style="margin:0 0 6px 0; font-size:14px; line-height:22px; font-weight:700; color:#0F172A;"> Co bude dál </p>
                                <p style="margin:0; font-size:14px; line-height:22px; color:#475569;"> Až dáte zelenou, vizitku dokončíme a nasadíme na vaši vlastní adresu. Když budete chtít něco doladit, stačí odepsat na tento e-mail, návrh upravíme a pošleme znovu.</p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 32px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 12px 0; font-size:16px; line-height:26px; color:#334155;"> Máte poznámky nebo je vše v pořádku? <strong style="color:#0F172A;">Stačí odepsat na tento e-mail.</strong> </p>
                            <p style="margin:0; font-size:15px; line-height:24px; color:#475569;"><a href="mailto:hello@solopixel.cz" style="color:#0F766E; text-decoration:none; font-weight:600;">hello@solopixel.cz</a> &nbsp;·&nbsp; <a href="tel:+420774291077" style="color:#0F766E; text-decoration:none; font-weight:600;">+420 774 291 077</a></p>
                        </td>
                    </tr>
                    <tr>
                        <td class="px" style="padding:0 48px 40px 48px; font-family:'Montserrat', Helvetica, Arial, sans-serif;">
                            <p style="margin:0 0 4px 0; font-size:15px; line-height:22px; color:#0F172A;"> Těšíme se na vaši zpětnou vazbu<br /><strong style="color:#0F172A; font-weight:700;">Lukáš Kaleta</strong></p>
                            <p style="margin:0; font-size:13px; line-height:20px; color:#64748B;"> SoloPixel, váš digitální parťák</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#F8FAFC; padding:24px 48px; border-top:1px solid #E2E8F0;" class="px">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="font-family:'Montserrat', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#94A3B8;"><strong style="color:#475569;">SoloPixel</strong> · Frýdek-Místek<br /><a href="mailto:hello@solopixel.cz" style="color:#0F766E; text-decoration:none;">hello@solopixel.cz</a> &nbsp;·&nbsp; <a href="tel:+420774291077" style="color:#0F766E; text-decoration:none;">+420 774 291 077</a> &nbsp;·&nbsp; <a href="https://www.solopixel.cz/?utm_source=email&amp;utm_medium=preview&amp;utm_content=footer-brand" style="color:#0F766E; text-decoration:none;">www.solopixel.cz</a><br /><br /><span style="color:#B6C0CC;">Tento e-mail jste dostali, protože pro vás připravujeme digitální vizitku SoloPixel.</span></td>
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

async function main() {
  const store = db();
  const ref = store.collection("emailTemplates").doc(DOC_ID);
  const existing = await ref.get();

  await ref.set(
    {
      name: NAME,
      subject: SUBJECT,
      html: HTML,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists
        ? {}
        : { createdAt: FieldValue.serverTimestamp(), createdBy: "seed" }),
    },
    { merge: true }
  );

  console.log(
    `${existing.exists ? "🔄 Aktualizováno" : "✅ Vytvořeno"}: emailTemplates/${DOC_ID} — „${NAME}"`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Chyba:", err);
  process.exit(1);
});
