# Work Log

Nejnovější záznamy nahoře.

## 2026-06-15 — ✅ Fáze 28 – Nastavení: přestavba šablon (UI)

- **E-mailové šablony (`/nastaveni/sablony`):** odstraněn onboarding i provize. Šablony oslovení a předání vizitky přepínané záložkami (shadcn `Tabs`). Náhled e-mailu se otevírá v modalu (`Dialog max-w-3xl`) místo stálého 600px iframe — stránka je krátká.
- **Sdílená komponenta `EmailTemplateEditor`** (`components/settings/email-template-editor.tsx`): props `apiPath`, `renderEmail`, `defaultSubject`, `placeholderHint`, `sampleVars`, `label`. Obě záložky ji instancují — žádná duplicita.
- **Onboarding šablona → `/nastaveni/onboarding`:** přesunuta celá sekce (editor kroků, add/remove/update, načítání+ukládání přes `/api/templates/onboarding`) na vlastní admin podstránku.
- **Výchozí sazba provize → `/provize`:** přesunuta do admin-only karty nahoře na stránce provizí. Server component předává `isAdmin` + `defaultRate` klient komponentě; member/sales kartu nevidí.
- **Rozcestník (`/nastaveni`):** dlaždice „Šablony" přejmenována na „E-mailové šablony" s novým popisem. Nová dlaždice „Onboarding" → `/nastaveni/onboarding` (admin). Popis provizí rozšířen o zmínku výchozí sazby.
- `npm run lint` + `npm run build` čisté.

## 2026-06-15 — ✅ Fáze 27 – Předání hotové vizitky klientovi z CRM

- **Datový model:** nová kolekce `deliveryEmails` (zrcadlo `outreachEmails` pro předání vizitky). Sdílený enum `lib/schemas/email-status.ts` — `outreach-email.ts` re-exportuje pro zpětnou kompatibilitu.
- **Sender:** `sendOutreachEmail` zobecněn na `sendTransactionalEmail` v `lib/email.ts`; starý název zachován jako alias.
- **API endpoint:** `POST /api/clients/[id]` s `action: "send_card"` — vyřeší instanci (jedinou auto, víc → vyžaduje výběr), renderuje delivery šablonu, odešle přes Resend, zapíše `deliveryEmails`, loguje aktivitu. Volitelný checkbox přepne instanci na `live`.
- **Webhook:** `app/api/webhooks/resend/route.ts` hledá `resendId` v `outreachEmails` i `deliveryEmails` přes `findEmailByResendId()`. Delivery eventy logují aktivitu na klienta (otevřel / kliknul / nedoručitelné).
- **Template API:** `app/api/templates/delivery-email/route.ts` — GET/PUT subject, POST test e-mail (zrcadlo outreach).
- **UI – DeliveryDialog:** komponenta s oslovením (5. pád), výběrem instance (pokud víc), checkboxem „live", náhledem e-mailu, potvrzením při opětovném odeslání.
- **UI – Client detail:** tlačítko „Předat vizitku" v hlavičce; aktivní jen s e-mailem + instancí.
- **UI – Nastavení → Šablony:** nová sekce „Šablona předání vizitky" — předmět, náhled, testovací e-mail.
- **Firestore:** rules pro `deliveryEmails` (read auth, write false), composite index `clientId + sentAt desc`.
- **Data model:** `spec/context/data-model.md` aktualizován o `deliveryEmails` a `templates/delivery-email`.
- `npm run lint` + `npm run build` čisté.

## 2026-06-14 — ✅ Fáze 26 – Auto-refresh seznamů po akcích

- **Prospect detail sheet:** po „Zapsat kontakt" a „Odeslat oslovení" se activity log v sheetu okamžitě refetchne (`refreshActivities()`) + `router.refresh()` obnoví podkladový seznam. Sheet zůstává otevřený — záznam se ukáže bez zavření/otevření.
- **Úkoly:** optimistické toggle stavu (checkbox „hotovo") — okamžitá odezva přes `optimisticOverrides`, revert při chybě, `router.refresh()` po úspěchu.
- **Audit existujícího stavu:** většina mutací už volá `router.refresh()` (přímo nebo přes parent `onUpdate`/`onSuccess`). Nastavení/uživatelé používají lokální `fetchUsers()` — konzistentní pro client-managed page. Nastavení/šablony řídí stav lokálně — refresh nepotřeba.
- `npm run lint` + `npm run build` čisté.

## 2026-06-14 — ✅ Fáze 25 – Archivace a mazání kontaktů v Oslovení

- **Archivace:** `prospects` dostává `deletedAt`/`deletedBy`. Akce „Archivovat" v detailu kontaktu (admin/member).
- **Filtrace:** všechny pohledy Oslovení filtrují `!deletedAt` — seznam, vyhledávání (Cmd+K), dashboard (prospect stats), attention feed (follow-upy).
- **Archiv stránka:** typ „Oslovení" přidán, akce Obnovit + Trvale smazat. Hromadné smazání: checkbox výběr + batch delete (přeskočí záznamy s vazbami).
- **Trvalé smazání:** constraint check — konvertovaný prospekt nelze smazat. Při smazání se odstraní i `outreachEmails` + `activity` záznamy.
- **Archive API + helper:** `prospects` přidán do `validCollections` a `entityTypeMap`, constraint check, `permanentlyDelete` maže outreachEmails.
- `npm run lint` + `npm run build` čisté.

## 2026-06-14 — ✅ Fáze 24 – Override odesílatele oslovení

- **Efektivní odesílatel:** `senderEmail = userDoc.senderEmail ?? user.email`, `senderName = userDoc.senderName ?? displayName`. Bez override beze změny chování.
- **Validace:** `senderEmail` musí být na `@solopixel.cz` (`SENDER_DOMAIN` v `lib/email.ts`), jinak 400.
- **Users API:** PATCH přijímá `senderEmail`/`senderName` (jen admin, whitelist).
- **Správa uživatelů:** nový sloupec „Odesílatel" se dvěma inline inputy (e-mail + jméno), save on blur.
- **Profil:** read-only zobrazení odesílatele s poznámkou „Odesílatele nastavuje administrátor".
- **Dialog odeslání:** zobrazuje „Odesláno z: Jméno <email>" pod příjemcem.
- **User schema:** rozšířen o `senderEmail`, `senderName`.
- `npm run lint` + `npm run build` čisté.

## 2026-06-13 — ✅ Fáze 23 – Sjednocení domény na solopixel.cz

- `lib/siteUrl.ts` — centrální konstanty `WEB_URL`, `DEMO_URL`.
- Všechny `solopixel.eu` v kódu, šablonách a env nahrazeny za `solopixel.cz`.
- `npm run lint` + `npm run build` čisté.
- Manuální kroky: Vercel doména, Firebase Auth, Resend webhook, env redeploy.

## 2026-06-13 — ✅ Fáze 22 – HTML šablona oslovení (SoloPixel design)

- **Pevná HTML šablona:** `lib/email-templates/outreach.ts` — `renderOutreachEmail({ jmeno, odkaz })` vrací `{ html, text }`. HTML: brandový tabulkový layout SoloPixel (header s logem, CTA tlačítko, 4 body „Co v demu uvidíte", tip box, sign-off, compliance patička). Plain-text fallback pro doručitelnost.
- **Napojení na odesílání:** `lib/email.ts` zjednodušen — `renderTemplate` odstraněn, nahrazen `renderSubject` (jen předmět). Prospect send_email action a template test API používají `renderOutreachEmail` + `text` fallback do Resendu.
- **Nastavení → Šablony:** sekce zjednodušena — editovatelný jen předmět, tělo v iframe náhledu (ukázkové „Jan Nováku" + demo URL). Info „Tělo je v jednotném designu SoloPixel".
- **Dialog odeslání (detail prospekta):** náhled přepnut na HTML iframe s reálným oslovením a odkazem. Template type zjednodušen na `{ subject }` (bez `body`).
- **Default předmět:** `{{jmeno}}, takhle dnes vypadá vizitka, co pracuje za vás`. Fallback odkaz: `https://demo.solopixel.cz` pokud prospekt nemá `demoUrl`.
- `npm run lint` + `npm run build` čisté.

## 2026-06-13 — ✅ Fáze 21 – Nastavení jako rozcestník

- `/nastaveni` předěláno z redirectu na rozcestník s dlaždicemi: Uživatelé (admin), Šablony (admin), Archiv (admin+member), Provize (admin+member), Můj profil (všichni).
- Dlaždice filtrované dle role — member vidí jen Archiv, Provize, Profil.
- Sidebar: „Nastavení" nyní viditelné pro admin+member (ne jen admin); samostatný odkaz „Archiv" odstraněn (přístup přes rozcestník).
- `npm run lint` + `npm run build` čisté.

## 2026-06-13 — ✅ Fáze 20 – Mazání a archivace

- **Archivace (měkké smazání):** `deletedAt` + `deletedBy` na `clients`, `instances`, `leads`, `tickets`. Akce „Archivovat" na detailu klienta (admin/member). Dialog s potvrzením.
- **Kaskáda u klienta:** archivace klienta archivuje instance, tickety (otevřené) a zruší předplatné (`cancelled`). Faktury a provize zůstávají.
- **Filtrace archivovaných:** všechny seznamy, vyhledávání (Cmd+K), dashboard (leady, onboarding, aktivita), attention feed (tickety, leady), provize, API routes, sales-clients helper — filtrují `!deletedAt`.
- **Detail archivovaného:** baner „Archivováno" s datem + tlačítko „Obnovit" (admin/member).
- **Archiv stránka (`/nastaveni/archiv`):** tabulka archivovaných záznamů s filtrem dle typu. Akce Obnovit + Trvale smazat (jen admin). Trvalé smazání vyžaduje přepsání názvu a ověřuje vazby (409 pokud existují).
- **API `POST /api/archive`:** akce `archive` (+ kaskáda), `restore`, `delete` (admin only, constraint check). `GET /api/archive` — list archivovaných.
- **Helper:** `lib/archive.ts` — `archiveDocument`, `restoreDocument`, `cascadeArchiveClient`, `checkDeleteConstraints`, `permanentlyDelete`.
- **Nastavení layout:** rozšířen na admin+member (pro přístup k archivu).
- **Sidebar:** „Archiv" viditelný pro admin+member.
- Faktury: žádná mazací akce — beze změny, jen storno.
- `npm run lint` + `npm run build` čisté.

## 2026-06-13 — ✅ Fáze 19 – Přejmenování Prospekti → Oslovení

- Všechny viditelné UI texty „Prospekti/prospekt/prospekta" přejmenovány na „Oslovení / kontakt".
- Sidebar: „Oslovení". Cmd+K: placeholder a skupina „Oslovení". Aktivita: badge „Oslovení". Attention feed: „Follow-up" bez slova prospekt.
- Stránka `/prospekti`: nadpis „Oslovení", „Přidat kontakt", „Žádné kontakty k oslovení". Dialogy: „Přidat kontakt", „CSV Import kontaktů".
- Detail: toasty s „kontakt" místo „prospekt". Šablona oslovení: „kontaktů" místo „prospektů".
- Profil: výchozí stránka „Oslovení".
- Spec: `data-model.md` — poznámka „v UI zobrazeno jako »Oslovení«" u kolekce `prospects`.
- URL, kolekce, API, typy a proměnné beze změny.
- `npm run lint` + `npm run build` čisté.

## 2026-06-12 — ✅ Fáze 18 – Profil uživatele

- **Stránka `/profil`:** 3 záložky — Profil (fotka, jméno, telefon, e-mail readonly, sazba provize u sales), Zabezpečení (změna hesla přesunutá z dialogu, info o účtu), Preference (vzhled light/dark/system přes next-themes, výchozí stránka po přihlášení v localStorage).
- **Profilová fotka:** upload s client-side resize na 256×256 (canvas center-crop), Storage `avatars/{uid}.jpg`, `photoURL` propsán do `users` doc i Firebase Auth. Tlačítko „Odebrat fotku".
- **API `PATCH /api/me`:** whitelist polí (displayName, phone, photoURL) — cizí pole ignorována. `GET /api/me` vrací i Auth metadata (createdAt, lastSignIn).
- **UserAvatar komponenta:** `components/user-avatar.tsx` — fotka → fallback iniciály s deterministickou barvou dle uid. Použita v topbaru.
- **Topbar:** avatar menu — „Změnit heslo" nahrazeno „Můj profil" → `/profil`. Zobrazuje `displayName` a `photoURL` (načteno z DB v layoutu).
- **Login redirect:** respektuje `spx-default-page` z localStorage.
- **Storage rules:** `avatars/{uid}.jpg` — write jen vlastní uid, max 2 MB, `image/*`; read pro přihlášené.
- **User schema:** rozšířen o `photoURL`, `phone`.
- `npm run lint` + `npm run build` čisté.

## 2026-06-12 — ✅ Fáze 17 – Sales vidí jen své klienty

- **Klienti:** server query `where('salesOwnerUid', '==', uid)` pro sales; detail → `notFound()` pro cizí klienty.
- **Auto-přiřazení:** POST `/api/clients` — sales uživatel má `salesOwnerUid = uid` automaticky; payload je ignorován.
- **API guard:** GET/PATCH `/api/clients/[id]` — sales smí pouze vlastní; PATCH `salesOwnerUid` ignoruje z sales payloadu.
- **Vlastník = kdokoli:** select „Obchodní vlastník" rozšířen na všechny aktivní uživatele (admin si může přiřadit klienta na sebe). Provize vzniká jen vlastníkům s rolí sales (nezměněno).
- **Konverze leadu:** `salesOwnerUid` se nyní propisuje z `ownerUid` bez ohledu na roli (ne jen pro sales).
- **Navázaná data utěsněna pro sales:**
  - **Tickety:** stránka `/tickety` filtruje na tickety vlastních klientů; dialog „Nový ticket" nabízí jen vlastní.
  - **Podklady:** API `/api/submissions` filtruje submissions na submissions navázané na vlastní klienty.
  - **Vyhledávání (Cmd+K):** klienti a tickety filtrováni na vlastní.
  - **Aktivita:** stránka `/aktivita` + API `/api/activity/list` — client/ticket záznamy jen pro vlastní klienty.
  - **Dashboard:** onboarding přehled jen vlastních klientů; recent activity filtruje client/ticket entity.
  - **Attention feed:** tickety jen vlastních klientů; submissions pro sales skryté.
- **Helper:** `lib/sales-clients.ts` — `getSalesClientIds(uid, role)` pro opakované použití.
- **Firestore rules:** `clients` read — admin/member vše, sales jen `salesOwnerUid == uid`.
- **Dokumentace:** `project.md` aktualizováno — sales vidí jen vlastní klienty, leady/prospekti sdílené, auto-přiřazení.
- `npm run lint` + `npm run build` čisté.

## 2026-06-12 — ✅ Fáze 16 – Provizní systém pro obchodníky

- **Schémata:** `lib/schemas/commission.ts`, `clientSchema` rozšířen o `salesOwnerUid`, `userSchema` o `commissionRate`.
- **Vznik provize při zaplacení:** invoice PATCH handler „paid" — vytvoří provizi (doc ID = invoiceId, idempotentní) pokud klient má `salesOwnerUid` s rolí sales. Sazba = `users.commissionRate` ?? `settings/commission.defaultRate`. Zaokrouhlení na celé Kč.
- **Storno:** pending provize → `reversed`; paid provize → záporný záznam `{invoiceId}-reversal` (pending, odečte se v příštím vyúčtování).
- **Konverze leadu:** „Vyhráno" → pokud lead `ownerUid` je sales, nastaví `clients.salesOwnerUid`.
- **Detail klienta:** select „Obchodní vlastník" (sales uživatelé, mění jen admin/member) + logActivity.
- **Admin stránka `/provize`:** souhrn per obchodník (sazba, k vyplacení, vyplaceno letos), tabulka záznamů s filtry (obchodník, stav). Checkbox výběr → „Označit vyplacené" s poznámkou + „Kopírovat podklad" do schránky.
- **Sales stránka `/moje-vizitky`:** souhrn (čeká, vyplaceno letos, měsíční provize, sazba), tabulka mých klientů (stav, vizitka, tarif, cena/měs., provize/měs.), tabulka provizí (klient, částka, stav, datum).
- **Nastavení → Šablony:** default sazba provize (% input + uložit).
- **Users API:** rozšířeno o `commissionRate` update. Users page: role select doplněn o „Obchodník".
- **Sidebar:** „Moje vizitky" (Obchod, jen sales), „Provize" (Finance, admin/member).
- **Firestore rules:** `commissions` read (sales vlastní / admin+member vše), write deny. `settings` read pro přihlášené, write admin.
- **Composite indexy:** `commissions(salesUid, status)`, `commissions(status, earnedAt)`.
- **project.md:** aktualizována sekce o sales roli (výjimka — vidí provize a předplatné svých klientů).
- **UI komponenta:** `components/ui/checkbox.tsx`.
- `npm run lint` + `npm run build` čisté.

## 2026-06-12 — ✅ Fáze 15 – Dashboard layout v2

- **Nové rozložení dashboardu:** hlavní grid `lg:grid-cols-3` — levý sloupec (col-span-2): feed Vyžaduje akci (max 8 + „dalších N") → quick stats → onboarding přehled; pravý sloupec: kompaktní aktivita → oslovení tento týden → oslovování celkem.
- **Kompaktní aktivita:** jednořádkové záznamy, kruhový avatar s iniciálami (5×5 px, deterministická barva z UID), truncate text, relativní čas vpravo (`teď`, `2 h`, `včera`), max 6 záznamů. Hlavička „Aktivita" + odkaz „Vše →" na `/aktivita`.
- **Karta „Oslovení tento týden":** odesláno / otevřelo / kliklo na demo z `outreachEmails` (pro sales jen vlastní).
- **Karta „Oslovování celkem":** přesun ze spodní sekce do pravého sloupce (3 čísla: osloveno / reaguje / konverze).
- **Stránka `/aktivita`:** plný log aktivity s filtry (uživatel, typ entity, období od/do), server-side stránkování po 50 s „Načíst další". Proklik na entitu, avatar, badge entity typu, čas. EmptyState pro prázdné výsledky. API `GET /api/activity/list?cursor=`.
- **Sidebar:** položka „Aktivita" v sekci Přehled pod Dashboard (ikona `History`), viditelná všem.
- **Admin tabulka obchodníků:** zůstává pod gridem na celé šířce.
- `npm run lint` + `npm run build` čisté.

## 2026-06-12 — ✅ Fáze 14 – E-mailové oslovení (Resend)

- **Resend integrace:** `npm i resend svix`, `lib/email.ts` — `sendOutreachEmail()` + `renderTemplate()` (plain text → HTML s paragrafy). Env: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`.
- **Schémata:** `lib/schemas/outreach-email.ts` (status enum, statusOrder), prospect schéma rozšířeno o `demoUrl`.
- **Šablona oslovení (Nastavení → Šablony):** editor předmětu + těla s placeholdery `{{jmeno}}` a `{{odkaz}}`, tlačítko „Testovací e-mail" (pošle na adresu přihlášeného). API `GET/PUT/POST /api/templates/outreach-email`.
- **Odeslání z prospekta:** dialog s editovatelným oslovením (5. pád) a náhledem předmětu/těla. Route handler `POST /api/prospects/[id]` action=`send_email` — Resend send → doc `outreachEmails` → activity log → prospect status `contacted` (pokud `new`) + `lastTouchAt` + `nextFollowUpAt` (+3 pracovní dny). Ochrana: max 1 oslovení / 7 dní (429 s vysvětlením). Bez e-mailu nebo `demoUrl` = deaktivované tlačítko s důvodem.
- **Webhook `/api/webhooks/resend`:** ověření podpisu (svix), eventy `delivered`/`opened`/`clicked`/`bounced`/`complained`. Status se upgraduje (vyšší přepisuje nižší, bounced/complained vždy). Activity log: otevřel / kliknul na demo ✨ / nedoručitelné. `bounced` → prospect `unreachable` pokud nemá telefon.
- **Attention feed:** „Kliknul na demo — zavolej!" pro vlastníka prospekta (zmizí po dalším kontaktu).
- **Viditelnost v UI:** `demoUrl` pole ve formuláři a CSV importu, ikona `Monitor` v tabulce s proklikem. Sloupec posledního e-mail stavu (StatusBadge, kliknuto = ring highlight). Detail prospekta: odkaz na demo vizitku.
- **Status mapy:** `outreachEmailStatus` v `lib/status.ts`.
- **Firestore rules:** `outreachEmails` read pro přihlášené, write deny.
- **Composite index:** `outreachEmails(prospectId, sentAt)`.
- `npm run lint` + `npm run build` čisté.

**Manuální kroky pro uživatele:** (1) Resend: ověřit doménu solopixel.cz (DKIM/SPF), (2) API klíč → `RESEND_API_KEY` do Vercel + `.env.local`, (3) webhook URL `https://<crm>/api/webhooks/resend` + signing secret → `RESEND_WEBHOOK_SECRET`, (4) redeploy.

## 2026-06-12 — ✅ Fáze 13 – Prospekti (zásobník oslovení)

- **Zod schéma:** `lib/schemas/prospect.ts` — `prospectSchema`, `prospectFormSchema`, `contactFormSchema` + typy.
- **Activity rozšíření:** `entityType` nyní zahrnuje `"prospect"` v schématu, helperu i API.
- **Status mapy:** `lib/status.ts` — `prospectStatus`, `prospectChannel`, `prospectResult` se stavovými barvami.
- **API route handlers:**
  - `GET/POST /api/prospects` — seznam se stránkováním (cursor, limit 50), ruční přidání s deduplikací (e-mail / jméno+firma).
  - `GET/PATCH /api/prospects/[id]` — detail, editace.
  - `POST /api/prospects/[id]` — akce: `claim` (transakce brání souběhu), `release`, `contact` (zápis do activity + stav + follow-up), `convert` (vytvoří lead source=outreach), `not_interested`, `unreachable`.
  - `POST /api/prospects/import` — CSV import: deduplikace (e-mail / jméno+firma), batched writes po 500, `importBatchId`.
- **Stránka `/prospekti`:** záložky Volní/Moji/Všichni, filtry stav/vlastník/město/text, tabulka s řádkovou akcí Zabrat (optimistické UI + 409 toast), stránkování „Načíst další".
- **Detail prospekta (Sheet):** všechna pole, StatusBadge, odkaz na profil. Akce: Zapsat kontakt (kanál, výsledek, poznámka, follow-up), Převést na lead, Nemá zájem, Nedostupný, Uvolnit. Historie kontaktů přes ActivityTab.
- **CSV import dialog:** upload → automatické mapování sloupců → náhled 10 řádků → import s počtem nových/přeskočených.
- **Ruční přidání:** dialog s deduplikací (409 conflict).
- **Attention feed:** follow-up prospektů dnes/po termínu (jen vlastníkovy pro sales).
- **Dashboard:** sekce „Oslovování" — osloveno tento týden / reaguje / konvertováno. Admin/member vidí tabulku rozpad po obchodnících (zabráno, osloveno, reaguje, konverze).
- **Cmd+K:** prohledává prospekty (jméno, firma, město).
- **Sidebar:** „Prospekti" v sekci Obchod, mezi Leady a Klienti, ikona `BookUser`.
- **Firestore rules:** `prospects` read pro přihlášené, write deny (vše přes admin SDK).
- **Composite indexy:** `prospects(ownerUid, lastTouchAt)`, `prospects(status, lastTouchAt)`, `prospects(ownerUid, nextFollowUpAt)`.
- **UI komponenta:** `components/ui/textarea.tsx` (shadcn pattern).
- `npm run lint` + `npm run build` čisté.

## 2026-06-12 — ✅ Zprovoznění formuláře podkladů na produkci (debugging)

Odkaz z CRM vracel 404 / „Neplatný odkaz". Tři nezávislé příčiny, postupně odhalené a opravené:

1. **Formulář nebyl na produkčním webu** — stránka `/vizitka-formular` žila jen na větvi `fixing` v solopixel-web, produkce (`main`) ji neměla. Fix: merge + deploy (spolu s migrací domény na solopixel.eu).
2. **Firestore/Storage rules nebyly nikdy nasazené** — `firebase deploy` ze spx-core mířil do cizího projektu „staging" (starý `firebase use` v globální konfiguraci, chybělo `.firebaserc`). Fix: přidán `.firebaserc` s `markly-1bd84` + `firebase use markly-1bd84` + deploy rules a indexů.
3. **Web na Vercelu neměl `NEXT_PUBLIC_FIREBASE_*` env proměnné** — klientský SDK se připojoval k `projects/undefined` (ověřeno v Network tabu na URL Firestore channel requestu). Fix: doplnění env proměnných ve Vercelu (projekt webu) + redeploy.

Vedlejší opravy: CRM base URL formuláře přes `NEXT_PUBLIC_CARD_FORM_BASE_URL` (default `www.solopixel.eu/cs/...`); dialog předplatného umí „Platí od" / „Příští fakturace" pro import stávajících klientů.

**Ponaučení pro příště:** při deploy vždy zkontrolovat řádek `Deploying to 'markly-1bd84'`; u nové stránky závislé na Firebase ověřit env proměnné v cílovém prostředí; `projects/undefined` v Network tabu = chybějící `NEXT_PUBLIC_FIREBASE_PROJECT_ID` v buildu.

## 2026-06-12 — ✅ Fáze 8 – Nasazení na Vercel

- Build čistý, žádná tajemství v repu (.env.local v .gitignore).
- Session cookie `secure: true` v produkci ověřeno.
- Vercel.json nepotřeba (Next.js auto-detect).
- Manuální kroky: env proměnné ve Vercel UI, firebase deploy (rules + indexy + storage), authorized domains, smoke test.

## 2026-06-12 — ✅ Fáze 12 – Akční dashboard

- `lib/attention.ts`: server-side agregace položek vyžadujících akci (faktury po splatnosti, urgentní tickety, stagnující leady, nevyřízené podklady, onboarding úkoly po termínu).
- Feed „Vyžaduje akci": seznam s ikonami, barvami dle severity, prokliky. Prázdný stav „Vše vyřízeno".
- Finanční řádek (admin/member): MRR, zaplaceno/vyfakturováno tento měsíc, pipeline hodnota, mini sloupcový graf (recharts) zaplacených faktur za 12 měsíců.
- Onboarding přehled: klienti v onboardingu s progress barem úkolů, zvýraznění zaseknutých.
- Aktivita týmu: posledních 10 záznamů s relativním časem a prokliky.
- Sales role: ořezaný dashboard bez financí, jen vlastní položky.
- `npm run lint` + `npm run build` čisté.

## 2026-06-12 — ✅ Fáze 11 – Redesign (teal vzhled)

- Theme tokeny: primary teal-600 (light) / teal-400 (dark), radius 0.5rem, sidebar zinc-50/zinc-925.
- `lib/status.ts`: jednotný systém stavových barev (zelená/žlutá/červená/modrá/šedá) pro všechny entity.
- `lib/format.ts`: `formatCurrency()`, `formatNumber()`, `formatDate()` přes Intl.NumberFormat/DateTimeFormat.
- Sdílené komponenty: `StatusBadge`, `PageHeader`, `EmptyState`.
- Sidebar: seskupený do bloků (Přehled, Obchod, Provoz, Finance) s drobnými nadpisy.
- Logo SPX Core v teal barvě.
- `npm run lint` + `npm run build` čisté.

## 2026-06-12 — ✅ Fáze 10 – Role sales (obchodník)

- Třetí role `sales` v user schema, auth, custom claims.
- `requireRole()` podporuje více rolí (`requireRole('admin', 'member')`).
- Firestore rules: `invoices`/`subscriptions` read jen admin/member (ne sales).
- API ochrana: invoice/subscription route handlers vyžadují admin/member.
- Sidebar: Fakturace jen admin/member, Nastavení jen admin.
- Server-side ochrana `/fakturace` (requireRole), detail klienta nepředává finanční data sales uživateli.
- Dashboard pro sales: bez karty faktur po splatnosti.
- Správa uživatelů: role „Obchodník" v selectu.
- Datový model a project.md aktualizovány.
- `npm run lint` + `npm run build` čisté.

## 2026-06-12 — ✅ Fáze 9 – Podklady z webového formuláře

- Firestore rules: `card-tokens` (public get, list pro přihlášené), `card-submissions` (public create s validací, read pro přihlášené).
- Storage rules: `cards/{token}/{fileName}` (public read/write, max 5 MB, images).
- Zod schémata: `card-token.ts`, `card-submission.ts`. Data model aktualizován.
- Generování odkazu z detailu klienta: tlačítko „Poslat formulář podkladů", nanoid token, kopírování URL, detekce existujícího tokenu.
- Stránka `/podklady` v sidebaru: tabulka submissions, detail v Sheet (po sekcích), akce „Označit zpracované".
- Dashboard: karta „Nevyřízené podklady" s počtem a proklikem.
- API: `GET/POST /api/card-tokens`, `GET /api/submissions`, `PATCH /api/submissions/[id]`.
- `npm run lint` + `npm run build` čisté.

## 2026-06-12 — ✅ Fáze 7 – Doplňky a dotažení

- `useCollection<T>` hook pro realtime Firestore listenery (onSnapshot, unsubscribe, loading/error).
- Globální vyhledávání Cmd+K: cmdk dialog, API `GET /api/search?q=`, prohledává klienty/leady/tickety.
- Správa hesel: změna vlastního hesla (reauthenticate + updatePassword), admin reset hesla, zapomenuté heslo na login stránce.
- Task schema rozšířen o `ticketId`.
- Filtry ticketů rozšířeny: stav, typ, priorita, klient.
- Storage rules: ticket přílohy (max 10 MB, images/PDF).
- `npm run lint` + `npm run build` čisté.

## 2026-06-11 — ✅ Fáze 6 – Úkoly, tickety a dashboard

- `/ukoly`: seznam Moje/Všechny, filtr, checkbox dokončení, dialog nového úkolu (klient, řešitel, termín), overdue zvýraznění.
- `/tickety`: tabulka (typ, titul, klient, priorita, stav, stáří), filtr dle stavu, dialog nového ticketu, detail v Sheet se změnou stavu.
- `/`: dashboard s 4 kartami (pipeline leadů, faktury po splatnosti, otevřené tickety, moje úkoly) s prokliky, sekce dnešních/zpožděných úkolů.
- `/nastaveni/sablony`: správa onboarding šablony (kroky s offsetDays), integrováno s konverzí leadu.
- Záložky Úkoly a Tickety na detailu klienta s reálnými daty + metriky na záložce Přehled.
- API: tasks CRUD, tickets CRUD, templates GET/PUT.
- Firestore rules: tasks status update, tickets create/update, templates write pro admin.
- Composite indexy pro tasks a tickets.
- `npm run lint` + `npm run build` čisté.

## 2026-06-11 — ✅ Fáze 5 – Fakturace a předplatné

- Předplatné na detailu klienta: karta s tarifem, cenou, cyklem, stavem + dialog založení/úpravy. Tarify v `lib/plans.ts`.
- `/fakturace`: tabulka faktur (číslo, klient, částka, vystaveno, splatnost, stav), 3 stat karty (po splatnosti, vystaveno, zaplaceno tento měsíc), filtr dle stavu.
- Nová faktura: dialog s klientem, částkou, splatností. Číslo RRRR-NNN z transakce nad `counters/invoices`.
- Akce: zaplaceno, stornovat. Overdue se odvozuje při čtení.
- Záložka Faktury na detailu klienta s tabulkou filtrovanou na klienta.
- API: subscriptions CRUD, invoices CRUD. Composite index `invoices(clientId, issuedAt)`, `invoices(status, dueAt)`.
- `npm run lint` + `npm run build` čisté.

## 2026-06-11 — ✅ Fáze 4 – Leady a pipeline

- Kanban board `/leady` s drag & drop (@dnd-kit/core), sloupce dle fáze (Nový→Onboarding).
- Přepínač Kanban / Tabulka (TanStack Table s filtry fáze/zdroj/vlastník).
- Karta leadu: jméno, firma, hodnota, zdroj, vlastník, stáří.
- Detail leadu v Sheet: všechna pole, aktivita, akce Vyhráno/Ztraceno.
- Konverze Vyhráno: vytvoří klienta, generuje onboarding úkoly ze šablony.
- Ztraceno: dialog s povinným důvodem.
- Dialog nového leadu (jméno, firma, kontakty, zdroj, hodnota, vlastník).
- API: GET/POST /api/leads, GET/PATCH/POST /api/leads/[id].
- Firestore rules: leads stage update pro přihlášené, index leads(stage, updatedAt).
- `npm run lint` + `npm run build` čisté.

## 2026-06-11 — ✅ Fáze 3 – Klienti a DBC instance

- Seznam klientů `/klienti`: TanStack Table (jméno, firma, email, stav, slug, počet instancí, poslední aktivita), fulltext filtr, filtr dle stavu, dialog „Nový klient" (react-hook-form + zod).
- Detail klienta `/klienti/[id]`: hlavička se stavem a akcí Upravit, záložky Přehled/Instance/Faktury/Úkoly/Tickety/Aktivita.
- Instance tab: tabulka instancí klienta, přidání/úprava (doména, slug, stav, verze, features, repo/deploy URL, odkaz na vizitku).
- Aktivita tab: timeline z kolekce `activity`, přidání poznámky.
- `lib/activity.ts` — helper `logActivity()` volaný ze všech mutací.
- API routes: `POST/PATCH /api/clients`, `GET /api/clients/[id]`, `POST/PATCH /api/instances`, `GET/POST /api/activity`.
- Data čte Server Component přes admin SDK; mutace přes route handlers.
- `npm run lint` + `npm run build` čisté.

## 2026-06-11 — ✅ Fáze 2 – Auth a role

- Login stránka: e-mail + heslo, react-hook-form + zod validace, české chybové hlášky.
- Session cookie auth: `POST /api/auth/session` (admin SDK → httpOnly cookie), `DELETE` pro logout. `lib/auth.ts` s `getCurrentUser()`, `requireAuth()`, `requireRole()`.
- Ochrana rout: `app/(app)/layout.tsx` server-side redirect, middleware pro cookie existence check.
- Custom claims `role: admin | member`. Helper `requireRole('admin')` pro route handlers.
- Bootstrap skript `scripts/create-admin.ts` (tsx) — funguje proti emulátoru i produkci.
- Správa uživatelů `/nastaveni/uzivatele/` (admin only): tabulka, dialog „Přidat uživatele" (email, jméno, role → Auth + Firestore), deaktivace, změna role.
- Topbar: avatar menu s e-mailem, rolí a funkčním odhlášením.
- Firestore rules: čtení pro přihlášené, `users` zápis jen admin, activity append-only, ostatní kolekce deny write.
- `npm run lint` + `npm run build` čisté.

## 2026-06-11 — ✅ Fáze 1 – Základ aplikace (scaffold)

- Next.js 16.2.9 (App Router, TS strict, bez src/), React 19, Tailwind CSS 4, ESLint.
- shadcn/ui (Base UI, zinc, CSS variables): button, input, label, card, table, dialog, dropdown-menu, select, badge, tabs, sonner, sheet, avatar, separator, skeleton.
- Firebase SDK (client lazy init + admin singleton), `.env.example`, `firebase.json` s Emulator Suite (auth, firestore, storage), `firestore.rules` (deny-all), `firestore.indexes.json` (prázdné), npm script `emulators`.
- Dark mode přes `next-themes` (class strategy), přepínač v topbaru.
- Layout shell: `app/(app)/layout.tsx` — sidebar (lucide ikony, aktivní stav) + topbar (search placeholder, dark mode toggle, avatar menu). Na mobilu sidebar v Sheet.
- Placeholder stránky: Dashboard, Leady, Klienti, Fakturace, Úkoly, Tickety, Nastavení (se Skeleton), login placeholder.
- Zod schémata všech entit z data-model.md: users, clients, instances, leads, subscriptions, invoices, tasks, tickets, activity.
- `npm run lint` + `npm run build` čisté.

## 2026-06-11 — ✅ Založení projektu – kontext, datový model, prompty fází

- Vytvořen kompletní základ AI workflow: `CLAUDE.md`, `spec/context/` (agents, project, data-model, workflow), `spec/plans/`, `spec/prompts/` (přehled + fáze 1–6).
- Rozhodnutí: Next.js 16 (App Router) + React 19 + TS + Tailwind 4 + shadcn/ui; Firebase (Firestore, Auth s custom claims, Storage); Vercel hosting; malý tým s rolemi admin/member; UI česky bez i18n.
- Rozsah CRM: klienti + DBC instance, leady/pipeline (kanban), fakturace/předplatné, úkoly + onboarding šablony, tickety (bug/change request).
- Další krok: spustit fázi 1 (`spec/prompts/01-zaklad.md`) v Claude Code.
