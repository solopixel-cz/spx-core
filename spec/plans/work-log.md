# Work Log

Nejnovější záznamy nahoře.

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
