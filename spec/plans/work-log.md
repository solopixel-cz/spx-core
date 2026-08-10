# Work Log

Nejnovější záznamy nahoře.

## 2026-08-10 — 🔧 Fáze 32C — Export evidence faktur pro účetní

- **CSV export** `GET /api/invoices/export?from=&to=` (`requireRole admin/member`): faktury za období dle data vystavení; sloupce číslo, klient, IČO, VS, vystaveno, splatnost, úhrada, stav, částka. Oddělovač `;` + BOM (CZ Excel), escapování polí. Dotaz `where(issuedAt) + orderBy(issuedAt)` (bez composite indexu).
- **UI** `components/invoices/invoice-export-dialog.tsx` — dialog s presety (Tento měsíc / Tento rok / Vše) + ruční od–do; tlačítko „Export" v hlavičce přehledu fakturace.
- Ověřeno nad reálnými daty (join klienta+IČO, VS, stavy, data). CRM = jediná evidence. Lint + build čisté. Zbývá D (odstranění Fakturoidu).

## 2026-08-10 — 🔧 Fáze 32B — Vlastní PDF faktury + QR platba

- **PDF generátor** `lib/pdf/invoice-pdf.tsx` (`@react-pdf/renderer`): hlavička dodavatel/odběratel, položky se slevou, součet, platební údaje, poznámka, patička, „Nejsem plátce DPH". Font Roboto (`assets/fonts/*.ttf`) vložen jako Type0/FontFile2 → funguje česká diakritika (standardní PDF Helvetica ne).
- **QR platba (SPAYD)** `lib/spayd.ts`: `buildSpayd` + `accountToIban` (dopočet CZ IBAN z čísla účtu; ověřeno na `19-2000145399/0800` → `CZ65…`). QR jako PNG vložené do PDF.
- **Endpoint** `GET /api/invoices/[id]/pdf` — `application/pdf` inline, vyžaduje `settings/company`.
- **E-mail** `send/route.ts`: příloha PDF z vlastního generátoru (místo Fakturoidu), platební údaje ze `settings/company` (fallback env). QR jen v PDF (Gmail blokuje data-URI v těle).
- **UI** detail faktury: tlačítko „Stáhnout PDF", odebrána sekce „Do Fakturoidu".
- **Branding SPX (decentní):** pixel logo SoloPixel (Svg/Rect, mint čtverec) v hlavičce, teal akcent linka, teal labely sekcí, souhrn „Celkem k úhradě" v mint tintu, mint patička. Paleta dle solopixel.cz (teal #0d9488 / mint #5eead4 / slate). Font beze změny (Roboto). Oprava hlavičky (překryv čísla) a centrování souhrnu; logo bez wordmarku dle přání zadavatele.
- **Číselná řada CRM:** nový formát `RRRR-NNNN` s vlastním blokem od 7001 (`lib/invoice-number.ts`, `INVOICE_NUMBER_BLOCK_START=7000`) — CRM není jediný zdroj fakturace, řada musí být odlišná. VS = číslo bez pomlčky (`20267001`). Čítač `counters/invoices` resetnut na `{2026, seq:0}` skriptem `scripts/reset-invoice-counter.ts` → první faktura = `2026-7001` (ověřeno bez kolize: existující 2026-001/002/003/900).
- **Ověřeno trackování e-mailů faktur** (fáze 31A stále platí): send zapíše `invoiceEmails` (resendId), webhook párování + only-upgrade, `opened`→aktivita+notifikace, `clicked`/`bounced`→aktivita; přehled i detail zobrazují badge stavu.
- `next.config.ts`: `serverExternalPackages: ["@react-pdf/renderer"]` + `outputFileTracingIncludes` pro fonty. Nové deps: `@react-pdf/renderer`, `qrcode`.
- Ověřeno: PDF 23 KB, `%PDF-`, 2× Type0 font + FontFile2 + QR image. Lint + build čisté. Zbývá C (export), D (odstranění Fakturoidu).

## 2026-08-10 — 🔧 Fáze 32A — Fakturační údaje (klient + dodavatel)

- Rozhodnutí (zadavatel): fakturaci řídit plně z CRM, zrušit Fakturoid (úspora ~4 000 Kč/rok). Stav platby ručně, CRM = jediná evidence (+ export pro účetní), QR platba ano. Plán: `spec/prompts/32-fakturace-bez-fakturoidu.md`.
- **Klient rozšířen** o fakturační adresu (`billingStreet`, `billingZip`, `billingCity`) — schéma, formulář, detail, API (přes `clientFormSchema` automaticky), `page.tsx` whitelist, data-model.
- **Dodavatelské údaje** `settings/company` — schéma `lib/schemas/company.ts`, `GET/PUT /api/settings/company` (PUT jen admin), stránka `/nastaveni/fakturacni-udaje` + `components/settings/company-form.tsx`, dlaždice v rozcestníku. Nahradí env `COMPANY_BANK_ACCOUNT`.
- Data-model: přidán `settings/company`, doplněny fakturační pole klienta.
- `npm run lint` + `npm run build` čisté. Zbývá: B (PDF+QR), C (export), D (odstranění Fakturoidu).

## 2026-08-09 — ✅ Fakturace Fáze C+D — Fakturoid integrace + fakturační cron

Dokončení fakturace: napojení na Fakturoid (účetní pravda + PDF + stav platby z ČSOB) a automatizace přes Vercel Cron. Fakturoid API tvary ověřeny proti oficiální dokumentaci (OAuth client_credentials, subjects s custom_id, invoices s lines/due, download.pdf).

**Fáze C — Fakturoid (manuální, spící dokud není nakonfigurováno):**
- `lib/fakturoid.ts` — OAuth 2.0 client credentials (token cache 2 h), `findOrCreateSubject` (dedup přes `custom_id`=clientId), `createInvoice`, `getInvoice` (stav+paid_on), `downloadInvoicePdf` (retry na 204). `isFakturoidConfigured()` gate.
- `POST /api/invoices/[id]/fakturoid` — ruční push: vytvoří odběratele + fakturu, uloží `fakturoidId/Number/Status` na fakturu a `fakturoidSubjectId` na klienta. Idempotentní. Vytváření reálného dokladu = záměrně manuální (tlačítko), ne auto.
- Send route: pokud má faktura `fakturoidId`, přiloží PDF z Fakturoidu (rozšířen `sendTransactionalEmail` o `attachments`).
- UI detailu: tlačítko „Do Fakturoidu" / badge s číslem.

**Fáze D — Vercel Cron (`vercel.json`, denně 06:00 UTC, chráněno `CRON_SECRET`):**
- `GET /api/cron/billing`: (1) generuje faktury z předplatných s `nextInvoiceAt <= now` (roční = 12× měsíční, sleva `discountPercent`), posune `nextInvoiceAt`; (2) materializuje `overdue` u faktur po splatnosti + notifikace adminům; (3) syncuje stav zaplacení z Fakturoidu → `markInvoicePaid` → provize.
- Refaktor: sdílené `lib/invoice-number.ts` (číslo faktury) a `lib/invoice-actions.ts` (`markInvoicePaid` + `createCommissionIfNeeded`, přesunuto z `[id]/route.ts`) — používá route i cron.
- Lint (0 errors), build, typecheck čisté. Nové routy v buildu.

**Manuální kroky (uživatel):** Fakturoid API klíč (slug + client_id/secret) do Vercel env; `CRON_SECRET`; `firebase deploy` netřeba (žádné nové indexy — reuse status+dueAt). Fáze C ověřit naostro testovací fakturou. Pozn.: první běh cronu označí všechny stávající faktury po splatnosti jako overdue (dávka notifikací).

## 2026-08-09 — ✅ Fakturace Fáze B — detail faktury + položky + koncept

Bohatší faktura a stránka detailu (příprava dat i pro Fakturoid ve fázi C).

- `lib/schemas/invoice.ts` rozšířeno: `items[]` (popis/množství/cena), `variableSymbol`, `subscriptionId?`, `note?`, `sentAt?`; helper `invoiceItemsTotal`. `invoiceFormSchema` přepsán na řádkové položky + `asDraft`.
- `components/invoices/invoice-form-dialog.tsx` — sdílený formulář (create i edit) s dynamickými položkami (`useFieldArray`), živý součet, VS, poznámka, „Uložit koncept"/„Vystavit".
- `POST /api/invoices` — amount = součet položek, VS (zadaný nebo z čísla faktury), status draft/sent, ukládá items/note.
- `PATCH /api/invoices/[id]` — nová akce `update` (jen pro koncept): přepočet amount, úprava položek/VS/splatnosti/poznámky.
- `app/(app)/fakturace/[id]/page.tsx` + `invoice-detail-client.tsx` — detail: hlavička se stavem, meta dlaždice (částka/vystaveno/splatnost/VS), tabulka položek, poznámka, historie odeslaných e-mailů (badge), timeline aktivity; akce Odeslat/Zaplaceno/Stornovat + Upravit (koncept). Aktivita čtena přes existující index (entityType+entityId+createdAt).
- Seznam faktur: „Nová faktura" přes sdílený dialog, čísla faktur proklikem na detail.
- Lint (0 errors; benigní react-compiler warning u RHF `watch`), build, typecheck čisté.
- **Zbývá C** (Fakturoid API: PDF + stav platby z ČSOB → provize) a **D** (Vercel Cron).

## 2026-08-09 — 🔨 Fakturace: plán rozšíření + Fáze A (odeslání e-mailem + tracking)

Zadavatel chce vystavovat/odesílat faktury klientům s trackingem doručení/otevření a vidět stav zaplacení (ČSOB). Zmapován současný stav (fakturace je minimální, e-mailová infra plně hotová, žádné PDF/banka/cron).

- **Architektonické rozhodnutí** (potvrzeno): Fakturoid = účetní pravda + PDF + zdroj stavu platby (využije existující ČSOB↔Fakturoid link); přímé ČSOB PSD2 API zavrženo (licencovaný TPP/certifikát). E-mail posílá CRM přes Resend kvůli trackingu. Zadavatel neplátce DPH.
- **Plán** sepsán do [`spec/prompts/31-fakturace-rozsireni.md`](../prompts/31-fakturace-rozsireni.md) — sub-fáze A (odeslání+tracking), B (detail+položky+VS), C (Fakturoid API+stav platby→provize), D (Vercel Cron: opakované faktury, overdue, upomínky). Index + data-model (`invoiceEmails`) aktualizovány.

**Fáze A — hotovo:**
- `lib/schemas/invoice-email.ts` — kolekce `invoiceEmails` (zrcadlí `deliveryEmails`).
- `POST /api/invoices/[id]/send` — Resend odeslání (odesílatel = přihlášený uživatel), zápis `invoiceEmails{status:sent}`, `logActivity(entityType:invoice)`, draft→sent. Guardy: klient bez e-mailu / stornovaná faktura → 400. Opakované odeslání povolené. Bankovní účet z volitelného env `COMPANY_BANK_ACCOUNT`, VS odvozen z čísla faktury (plná definice ve fázi B).
- `webhooks/resend` — přidán `invoiceEmails` do `findEmailByResendId` + větev logování na fakturu; `opened` → notifikace adminům „Klient otevřel fakturu".
- UI `fakturace`: tlačítko „Odeslat"/„Odeslat znovu" (stavy mimo paid/cancelled), sloupec/badge stavu e-mailu (recyklace `outreachEmailStatus` + `StatusBadge`). Stránka načítá poslední e-mail stav per faktura.
- `firestore.rules`: `invoiceEmails` (read isAuth, write admin SDK).
- Lint + build + typecheck čisté. Ověření v provozu (reálná faktura + webhook) po nasazení.
- **Pozn.**: e-mail zatím bez PDF (přijde s Fakturoidem, fáze C); nasadit rules (`firebase deploy --only firestore`).

## 2026-08-09 — ✅ Notifikační systém (in-app zvonek + Web Push na iPhone)

Zadavatel chtěl v CRM notifikace na události (poptávka z webu, otevřený/vyplněný podklad) — a pokud možno i popup na iPhone přes PWA. Postaveno obojí naráz; příjemci = admini (malý tým, centrální dohled).

- **In-app notifikace**: nová kolekce `notifications/{id}` (`recipientUid, type, title, body, href, entityType, entityId, readAt, createdAt`). Zvonek v topbaru (`components/notifications/notification-bell.tsx`) — **první nasazení `onSnapshot`** v appce přes existující nepoužitý `lib/hooks/use-collection.ts`. Badge s počtem nepřečtených, dropdown seznam, klik = `readAt` + navigace, sonner toast při příchodu nové.
- **Web Push (VAPID, bez FCM)**: `lib/push.ts` `sendPushToUsers()` (zaniklé odběry 404/410 maže), přidán `push` + `notificationclick` handler do `public/sw.js`. Odběry v `users/{uid}/pushSubscriptions/{hash(endpoint)}`. Přepínač `/nastaveni/notifikace` (`push-toggle.tsx`) — sám si zaregistruje SW, iOS nápověda (nutná PWA na ploše).
- **Server fan-out**: `lib/notifications.ts` `notify()` — najde aktivní adminy, batch zapíše in-app záznam + pošle push. Nikdy neshodí hlavní operaci (chyby jen loguje).
- **Zapojené event body**: web lead intake (`leads/intake`), vyplněné podklady (`submissions/notify`), otevřený e-mail s formulářem podkladů (`webhooks/resend`).
- **API**: `POST /api/push/subscribe|unsubscribe` (admin SDK, `requireAuth`).
- **Firestore**: rules pro `notifications` (čtu jen svoje, update jen `readAt`) + `pushSubscriptions` (jen admin SDK); composite index `recipientUid + createdAt`.
- **Závislost**: přidán `web-push` (+ `@types/web-push`). VAPID klíče v env (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- Lint + build + typecheck čisté. Commit `af73585` na `devel`. Ověřeno v provozu zadavatelem (intake → notifikace fungují).
- **Deploy pozn.**: nutné nasadit `firebase deploy --only firestore` (rules + index) a nastavit VAPID env na Vercelu (Production). iOS push jen z PWA přidané na plochu, iOS 16.4+.

## 2026-08-09 — ✅ Fix: dashboard přetékal na mobilu (recharts)

Uživatel hlásil, že dashboard je širší než displej. Příčina: `MiniBarChart` (recharts `ResponsiveContainer`) — na reálném mobilu při prvotním renderu (viewport se ustaluje) zafixuje širší SVG a roztáhne grid buňku KPI přes šířku viewportu. `main` má `overflow-y-auto`, což dle CSS spec dopočítá `overflow-x: auto` → vodorovný scroll. V headless Chromiu s pevným viewportem se neprojevilo (proto těžká reprodukce).

- `MiniBarChart`: ResponsiveContainer obalen `div.w-full.min-w-0`, `width="99%"` (recharts doporučený trik proti overflow), aby nikdy neroztáhl rodiče.
- `dashboard-client.tsx`: karta s grafem `min-w-0` (grid buňka se smrskne pod obsah).
- `app/(app)/layout.tsx`: `main` → `overflow-x-hidden overflow-y-auto` jako pojistka — stránka nikdy nescrolluje vodorovně (tabulky mají vlastní `overflow-x-auto` wrappery, takže nic přístupného se neoře).
- Jediný recharts v celé appce je tento graf (ověřeno grepem).
- Ověřeno: scénář „načíst na 980px → zúžit na 390px" (přesně to, co recharts na mobilu láme) — `main.scrollWidth == clientWidth`, graf se vejde do karty (není oříznutý). Lint + build čisté (51/51).

## 2026-08-09 — ✅ Responzivní dashboard + revize widgetů

Dashboard nebyl použitelný na mobilu (hlavně karta „Pipeline" = 6 holých čísel bez popisků, spoléhala na hover tooltip). Předěláno mobile-first po domluvě se zadavatelem.

- **Nové pořadí (mobile-first)**: Rychlé akce → Vyžaduje akci (feed, priorita) → akční upozornění → finanční KPI → detail. Feed je teď první, čísla až pak.
- **Rychlé akce** (nové): řádek tlačítek +Lead / +Klient / +Ticket / +Úkol v `PageHeader` action slotu (odkazy na sekce).
- **Faktury po splatnosti** (nové, admin/member): zvýrazněná destruktivní karta s částkou + počtem, odkaz na /fakturace. Data z `invoicesSnap` (status `overdue`) v `app/(app)/page.tsx`.
- **Dnešní follow-upy** (nové): prospekti s `nextFollowUpAt ≤ dnes` (follow-up má jen prospect schema, ne lead), po termínu zvýrazněné. Sales vidí jen vlastní.
- **Pipeline** oprava: místo 6 nepopsaných čísel funnel s popisky fází + bary + počty (`PIPELINE_STAGES`, škálováno na max).
- **Finanční KPI**: `grid-cols-2 md:grid-cols-4`, mini graf 12 měs. přes celou šířku (`col-span-2/4`) — už není osamocený a zmáčklý.
- **Oslovování zjednodušeno** (dle zadavatele): odebrány widgety „Oslovení tento týden", „Oslovování celkem" a tabulka „Oslovování po obchodnících" (je i na stránce Oslovení). Ponechán jen EngagementCard (otevření + kliknutí na demo). V `page.tsx` odstraněn `outreachEmails` dotaz + výpočty `prospectStats`/`prospectOwnerStats`/`outreachWeekStats`.
- Ověřeno: lint (0 errors) + build čisté (51/51); vizuálně 390px/1280px light+dark přes agent-browser (feed, upozornění, KPI, pipeline funnel, onboarding, aktivita, engagement).

## 2026-08-09 — ✅ Mobile-first administrace + brand theme solopixel.cz

Cíl: CRM plnohodnotně použitelné na mobilu (50/50 s desktopem) + vizuální sladění s webem solopixel.cz.

- **Brand theme** (`app/globals.css`, `app/layout.tsx`, `components/ui/button.tsx`): neutrály přepnuty z čisté šedi na slate; light mode teal-600 primary; dark mode = podpis webu — navy `#0b1220` pozadí, slate-900 karty, mint teal-300 `#5eead4` primary, sidebar tmavší navy s mint akcentem. Font Saira (latin-ext) na nadpisy (`--font-heading`, base rule h1–h3) a logo. Tlačítka pill (`rounded-full`) s jemným teal glow na hover u primary. Radius 0.5→0.625rem.
- **Sdílený mobilní vzor** (`components/entity-card.tsx`, nový): `EntityCardList`/`EntityCard`/`EntityCardEmpty` — desktop tabulka (`hidden md:block`) → mobil karty (`md:hidden`). Klikatelnost stretched-linkem přes titulek, vnitřní akce (tlačítka) s třídou `relative` zůstávají klikatelné. `grid-cols-1` + `min-w-0` proti overflow dlouhých titulků.
- **Aplikováno na**: klienti, oslovení (vč. tlačítka Zabrat na kartě), leady-tabulka, fakturace (vč. akcí Zaplaceno/Stornovat), tickety, podklady, provize (vč. checkboxu výběru k vyplacení), moje-vizitky (2 tabulky). Úkoly a aktivita už kartové byly — jen dorovnání. Filtry: `flex-wrap` + search `flex-1`; headery `text-2xl` + `flex-wrap`; layout `p-4 md:p-6`; stat gridy `grid-cols-2` na mobilu.
- **Kanban na mobilu** (`kanban-board/column.tsx`): sloupce `w-[80vw]` se `snap-x snap-mandatory` swipe; drag na dotyk až po podržení 250 ms (`TouchSensor`), myš beze změny (`MouseSensor` 5px) — swipe se nehádá s přetahováním.
- **Oprava Base UI Selectů**: filtry zobrazovaly raw hodnotu (`all`) místo labelu — doplněn `items` prop (klienti, fakturace, tickety, oslovení, provize, aktivita, leady).
- **Admin tabulky** (nastavení/uživatelé, detail klienta instance+faktury, dashboard obchodníci): ponechány jako tabulky s `overflow-x-auto` na mobilu.
- Dočasná routa `app/dev-preview/` (mock data, v produkci 404) pro vizuální kontrolu bez přihlášení — smazat před commitem.
- **Design polish (Apple × SoloPixel, bez glass efektů)**: Tabs přestavěny na iOS segmented control (`components/ui/tabs.tsx` — pill kontejner, aktivní segment bg-card + stín, na mobilu plná šířka a h-10; `line` varianta beze změny). Nový `components/filter-bar.tsx` — jednotný řádek filtrů s pill inputy/selecty (přes `data-slot` selektory), na mobilu h-9; nasazen na klienti, oslovení, leady, tickety, provize, aktivitu, fakturaci. Úkoly: filtr Moje/Všechny převeden z tlačítek na segmented control. `EntityCard`: rounded-2xl, p-4, `active:scale-[0.98]` press feedback, vzdušnější mezery; empty state py-10. `Card` (ui) rounded-xl→2xl. Kanban: sloupce rounded-2xl, počet leadů jako pill chip, karty rounded-xl. Řádky úkolů/aktivity/dashboard feedu: rounded-xl + bg-card + shadow-xs. Layout mobil `px-4 py-5`.
- **Oprava tabů na mobilu**: segmented control s mnoha položkami (detail klienta 6, šablony 4) přetékal a `justify-center` ořezával první položku — na mobilu nyní `justify-start` + horizontální scroll uvnitř pill kontejneru se skrytým scrollbarem.
- **Redesign detailu klienta** (`client-detail-client.tsx`): nová hero karta — avatar s iniciálami (teal tint), jméno + status badge, firma, klikatelné kontaktní chipy (`mailto:` / `tel:` / web vizitky) a řada akcí (Upravit / Podklady / Předat vizitku / Archivovat). Pod hero přehledové dlaždice 2×2 (Instance / Faktury s alertem po splatnosti / Úkoly / Tickety) s počty — tapnutí přepne na záložku (Tabs převedeny na controlled). Karty přehledu rounded-2xl + bg-card + shadow (i `SubscriptionCard`), poznámky přes celou šířku, tickety s českými popisky priority/stavu, řádky úkolů/ticketů rounded-xl. Select obchodního vlastníka: doplněn `items` (zobrazoval raw uid).
- **Brand ikony + PWA**: pixel symbol z loga solopixel.cz (3×3 mřížka, prázdný střed, mint pravý horní roh) jako sdílená komponenta `components/pixel-logo.tsx` (currentColor → funguje light/dark, prop `spin` pro rotaci). Favicon `app/icon.svg` — tmavá verze (navy #0b1121 + mint). PNG ikony generuje `scripts/generate-icons.mjs` (čistý Node + zlib, bez závislostí) → `public/icons/` (192/512/apple-180, navy pozadí + bílý pixel). PWA: `app/manifest.ts` (standalone, theme/background #0b1220), service worker `public/sw.js` (cache-first pro `_next/static` + ikony/fonty, network-first pro navigace s offline fallbackem, stale-while-revalidate pro zbytek, /api se necachuje), registrace `components/sw-register.tsx` jen v produkci. Root layout: `appleWebApp` metadata, apple-touch-icon, `viewport.themeColor` light/dark. Logo v sidebaru + mobilním menu: pixel (bez textu SoloPixel) + „SPX Core". Init obrazovka `app/(app)/loading.tsx`: rotující pixel.
- Pozn. pro příště: nespouštět `npm run build` souběžně s běžícím `next dev` — sdílejí `.next` a rozbije se turbopack cache (nutný restart s `rm -rf .next`).
- Ověřeno: lint (0 errors) + build čisté (52/52 stránek vč. /icon.svg a /manifest.webmanifest); vizuálně light/dark, 390px/1280px přes agent-browser (login, klienti + filtr, oslovení, fakturace, tickety, kanban, segmented taby, detail klienta, logo + spinner).
- TODO: reálný dotyk na zařízení (kanban swipe + hold-drag), případně karty místo overflow tabulek v detailu klienta.

## 2026-08-05 — ✅ Fáze 30 – Podklady v2 (nová struktura formuláře)

Companion k přestavbě webového formuláře (`spx-web`), který nově zapisuje vnořený payload `schemaVersion: 2`. Implementováno §1–§4 (§5 admin detail/copy-MD odloženo na potvrzení zadavatele).

- **View model** (`lib/submission-view-model.ts`, nový): `normalizeSubmission(raw)` sjednotí nový (v2, vnořené sekce) i starý plochý (legacy) tvar do jednoho `SubmissionView`, který konzumuje detail i AI prompt. Legacy pole bez v2 domova (LinkedIn/web/WhatsApp/reference → custom sítě, ostatní → `notes`), ať se nic neztratí. Popisky kódů (`MAIN_ACTION_LABELS`/`TONE_LABELS`/`ADDRESS_LABELS`, `label()`) + `domainLabel(hasDomain)`.
- **Čtení** (`app/api/submissions/route.ts`): místo ručního plochého mapování volá `normalizeSubmission`; e-mailový fallback token→klient čte z view modelu (funguje i pro v2, kde je e-mail v `basic.email`).
- **Schéma** (`lib/schemas/card-submission.ts`): `cardSubmissionSchema` přepsáno na v2 (vnořené sekce, enums); přidáno `legacyCardSubmissionSchema`. Data-model zdokumentován.
- **Detail** (`components/submissions/submissions-page-client.tsx`): nové sekce Kontakt / Sociální sítě / Co dělá / O mně / Pixela; kódy lidsky; custom sítě název→odkaz; `TextBlock` pro víceřádkové texty; prázdné sekce se skryjí.
- **AI Markdown** (`lib/submission-prompt.ts`): nové sekce, **bez IČO**, kódy čitelné, víceřádkové zachovány.
- **Změny formuláře v průběhu** (dle zadavatele): odebrán **Ceník** a celá sekce **Vzhled a poznámky**; **doména** je ano/ne otázka → web ukládá `basic.hasDomain: 'ano'|'ne'` (vlastní vs přání), CRM to odlišuje v detailu i AI MD. `legacy notes` zůstávají jen jako nosič doplňků starých záznamů (sekce „Poznámky").
- **Firestore rules** (`firestore.rules`): `card-submissions` create validuje v2 tvar (`schemaVersion==2`, identita v `basic`); `card-tokens` update povoluje jen `usedAt` (dřív `submitted/submittedAt`, což neodpovídalo webu). Nasadit `firebase deploy --only firestore`.
- **Ověření v prohlížeči**: oba write flow (create v2 + `usedAt` update) potvrzeny přímo proti live Firestore (200 OK). „Missing or insufficient permissions" při testu byl spotřebovaný token (submission dokument už existoval → `setDoc` jako `update` → správně blokováno), ne bug. Zbývá zelený end-to-end na čerstvém tokenu.
- `npm run lint` čistý (jen 2 předexistující TanStack warnings), `npm run build` čistý. Logika `normalize`/`buildSubmissionPrompt` ověřena na v2 i legacy vzorku (`tsx`).

## 2026-06-15 — Dashboard: otevření a kliknutí (denní rozpad)

- **Server** (`app/(app)/page.tsx`): nový dotaz na `activity` (createdAt ≥ dnes−8 dní). Události „Otevřel e-mail" a „Kliknul na demo ✨" rozbucketovány po dnech v zóně Europe/Prague (Intl `en-CA` pro day-key, ukotveno na pražské poledne kvůli DST). Sales vidí jen vlastní (actorUid = senderUid). Předáno `engagementDaily` (7 dní, nejstarší→nejnovější) + `engagementToday`.
- **UI** (`components/dashboard/engagement-card.tsx`): nová karta — velká čísla „dnes otevřelo / kliklo" + rozpad posledních 7 dní s mini bary (otevřelo modře, kliklo jantarově) a legendou. Zapojeno do pravého sloupce `dashboard-client.tsx` nad „Oslovení tento týden".
- Zdroj je activity log (přesné časy, logováno 1× na e-mail při první události) — narozdíl od `outreachEmails.status`, který drží jen nejzazší stav.
- Pozn.: React Compiler hlídá impure `new Date()` v argumentu `Promise.all` → cutoff hoistnut do constu `engagementSince` před voláním.
- `npm run lint` čistý (jen 2 předexistující TanStack warnings), `tsc --noEmit` čistý.

## 2026-06-15 — Follow-up e-mail (druhé oslovení prospektů)

- **Šablona** (`lib/email-templates/followup.ts`): `renderFollowupEmail({jmeno, odkaz})` v jednotném SoloPixel designu + `DEFAULT_FOLLOWUP_SUBJECT`. Kratší než oslovení, jiný úhel pro kontakty, které první e-mail otevřely, ale neklikly — nižší bariéra, „vizitka ≠ web", jedno CTA (otevřít na mobilu).
- **API akce** (`app/api/prospects/[id]/route.ts`): nová akce `send_followup_email`. Gate: prospekt má e-mail + existuje předchozí oslovení v `outreachEmails` + min. 3denní odstup od posledního e-mailu. Ukládá do `outreachEmails` s `template: 'followup'` (sdílený webhook tracking), loguje aktivitu, posouvá `nextFollowUpAt` o +3 prac. dny.
- **Šablona v CRM** (`app/api/templates/followup-email/route.ts` + záložka „Follow-up" v `nastaveni/sablony/page.tsx`): předmět editovatelný adminem, GET/PUT/POST (test e-mail) jako u oslovení.
- **UI** (`components/prospects/prospect-detail-sheet.tsx`): tlačítko „Odeslat follow-up" + dialog s náhledem předmětu a e-mailu.
- **Schema** (`lib/schemas/outreach-email.ts`): přidáno optional `template: 'outreach' | 'followup'`.
- **Data-model** (`spec/context/data-model.md`): zdokumentováno pole `template`, akce a `templates/followup-email`.
- `npm run lint` čistý (jen 2 předexistující TanStack warnings), `tsc --noEmit` čistý. `next build` nešel dokončit kvůli omezení mountu (EPERM unlink v `.next` při finalizaci) — kompilace ale proběhla (BUILD_ID + manifesty vygenerovány). Doporučeno ověřit `npm run build` lokálně.

## 2026-06-15 — Podklady: doplnění nových polí formuláře

- **Zod schéma** (`lib/schemas/card-submission.ts`): přidáno 9 optional polí — `companyName`, `whatsapp`, `motto`, `instagram`, `linkedin`, `facebook`, `website`, `referenceUrl`, `wantsCareerTab`.
- **API route** (`app/api/submissions/route.ts`): explicitní mapování všech nových polí v `submissionsSnap.docs.map`.
- **Detail podkladu** (`submissions-page-client.tsx`): rozšířen `Submission` interface, Společnost + WhatsApp do Kontakt, Motto do Profil, Zájem o Spolupráci do Profese, nová sekce „Sociální sítě a reference" (Instagram, LinkedIn, Facebook, Web, Reference).
- **AI prompt** (`lib/submission-prompt.ts`): rozšířen `SubmissionData` interface + `buildSubmissionPrompt` — Společnost + WhatsApp v Kontakt, Motto v Profil, nová sekce Sociální sítě a reference se zájmem o Spolupráci.
- `npm run lint` + `npm run build` čisté.

## 2026-06-15 — ✅ Fáze 29 – Kopírovat podklad pro AI

- **Helper `buildSubmissionPrompt`** (`lib/submission-prompt.ts`): sestaví Markdown prompt s úvodní instrukcí + datovými sekcemi (Kontakt, Profese, Profil, Vizitka). Vynechává IČO (`companyId`) a prázdná pole. Pole (arrays) spojená čárkou, `reasons` středníkem, `bio` víceřádkové.
- **Tlačítko „Kopírovat pro AI"** v detail Sheetu (`submissions-page-client.tsx`): umístěno pod hlavičku (jméno + badge), nad první Separator. `navigator.clipboard.writeText` + toast success/error. Ošetřen nezabezpečený kontext.
- `npm run lint` + `npm run build` čisté.

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
