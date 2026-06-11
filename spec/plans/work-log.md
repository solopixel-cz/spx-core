# Work Log

Nejnovější záznamy nahoře.

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
