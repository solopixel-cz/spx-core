# SPX Core — Project Context

## Co je SPX Core

**SPX Core** je interní CRM a provozní centrum pro SoloPixel digitální vizitky (DBC). Nahrazuje dosavadní evidenci v Google Docs a tabulkách. Slouží malému týmu (2–5 lidí) ke správě celého životního cyklu klienta: od leadu přes onboarding až po fakturaci a podporu.

### Hlavní domény

1. **Klienti & DBC instance** — evidence klientů (finanční poradci) a jejich vizitek: stav, doména, verze, konfigurace (`ADVISOR_SLUG`), odkaz na repo/deploy.
2. **Leady & pipeline** — obchodní trychtýř: Nový → Osloven → Demo → Nabídka → Smlouva → Onboarding → Aktivní / Ztracený. Kanban pohled.
3. **Fakturace & předplatné** — tarify, fakturační cyklus, splatnosti, stav plateb, upomínky.
4. **Úkoly & onboarding** — úkoly vázané na klienta/lead, onboarding checklisty ze šablon.
5. **Tickety** — hlášení bugů a požadavků na změnu vizitky, vázané na klienta/instanci, s prioritou a stavem.

## Tech stack

| Vrstva | Technologie |
|--------|-------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **Backend** | Firebase — Firestore (data), Auth (přihlášení + role přes custom claims), Storage (přílohy) |
| **Server logika** | Next.js Server Components + Route Handlers s `firebase-admin` |
| **Formuláře** | react-hook-form + zod |
| **Tabulky** | TanStack Table |
| **Hosting** | Vercel |

### Proč Firebase

- Auth, DB a Storage jako služba — minimum vlastní backend údržby.
- Realtime listeners zdarma (živé aktualizace kanbanu, ticketů).
- Firestore security rules + custom claims pokryjí role admin/member.
- Tým je malý, objem dat nízký — free/Blaze tier stačí.

### Architektura — zásady

- **Server-first:** čtení dat přes `firebase-admin` v Server Components; klientský Firebase SDK jen tam, kde je potřeba realtime nebo optimistické UI (kanban, tickety).
- **Validace na hranici:** každý zápis prochází zod schématem (sdílené v `lib/schemas/`), Firestore rules jsou druhá obranná linie.
- **Žádná duplikace typů:** typy entit se odvozují ze zod schémat (`z.infer`).
- **Denormalizace s rozmyslem:** Firestore není SQL — agregace (počet otevřených ticketů klienta apod.) se udržují přes Cloud Functions triggery nebo se počítají při čtení, dokud je objem malý.

## Datový model

Detailně v [`data-model.md`](data-model.md). Kolekce: `users`, `clients`, `instances`, `leads`, `subscriptions`, `invoices`, `tasks`, `tickets`, `activity`.

## UI/UX koncept

- **Layout:** levý sidebar (Dashboard, Leady, Klienti, Fakturace, Úkoly, Tickety, Nastavení) + horní lišta s globálním vyhledáváním (cmd+K) a profilem.
- **Dashboard:** přehled — leady podle fáze, faktury po splatnosti, otevřené tickety, dnešní úkoly.
- **Klient = centrální entita:** detail klienta má záložky (Přehled, Instance, Faktury, Úkoly, Tickety, Aktivita). Vše ostatní na něj odkazuje.
- **Kanban pro leady**, tabulky s filtrováním pro vše ostatní.
- **Jazyk UI: čeština.** Interní nástroj, žádná i18n.
- **Vizuální styl:** čistý, neutrální (shadcn default, zinc), SoloPixel akcent barva. Tmavý režim od začátku (snadné se shadcn).

## Vztah k ostatním SoloPixel projektům

- **spx-dbc** — produkt (vizitka), jehož instance SPX Core eviduje. Sdílí konvence (spec/ workflow, commit style).
- **solopixel-web** — marketing web; leady z kontaktních formulářů mohou později téct do SPX Core přes API.

## Neobvyklé / důležité chování

- Role se řeší přes Firebase Auth **custom claims** (`role: admin | member | sales`) — nastavuje se server-side, klient je jen čte. Sales nemá přístup k cizím financím (faktury, předplatná). **Výjimka:** sales vidí předplatné a provize **svých** klientů (přes `/moje-vizitky`), ale ne faktury, a ne data cizích klientů.
- **Provizní systém:** obchodník (sales) dostává doživotní podíl z každé zaplacené faktury svých klientů. Sazba = `users.commissionRate` ?? `settings/commission.defaultRate`. Provize vzniká automaticky při označení faktury jako zaplacené.
- Registrace je **uzavřená** — uživatele zakládá admin, žádný veřejný signup.
- Čísla faktur generuje transakce nad počítadlem v dokumentu `counters/invoices` (formát `RRRR-NNN`).
