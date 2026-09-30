# SPX Core — Project Context

## Co je SPX Core

**SPX Core** je interní CRM a provozní centrum pro SoloPixel digitální vizitky (DBC). Nahrazuje dosavadní evidenci v Google Docs a tabulkách. Slouží malému týmu (2–5 lidí) ke správě celého životního cyklu klienta: od oslovení (a poptávek z webu) přes onboarding až po fakturaci a podporu.

### Hlavní domény

1. **Klienti & DBC instance** — evidence klientů (finanční poradci) a jejich vizitek: stav, doména, verze, konfigurace (`ADVISOR_SLUG`), odkaz na repo/deploy.
2. **Oslovení → klient** — kontakty k oslovení a poptávky z webu; z kontaktu se rovnou vytváří klient. (Leady a kanban pipeline zrušené 2026-09-30.)
3. **Fakturace & předplatné** — tarify, fakturační cyklus, splatnosti, stav plateb, upomínky.
4. **Úkoly & onboarding** — úkoly vázané na klienta, onboarding checklisty ze šablon.
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

Detailně v [`data-model.md`](data-model.md). Kolekce: `users`, `clients`, `instances`, `prospects`, `projects`, `subscriptions`, `invoices`, `tasks`, `tickets`, `activity`.

## UI/UX koncept

- **Layout:** levý sidebar (Dashboard, Oslovení, Klienti, Fakturace, Úkoly, Tickety, Nastavení) + horní lišta s globálním vyhledáváním (cmd+K) a profilem.
- **Dashboard:** přehled — MRR, rozpracované zakázky, faktury po splatnosti, otevřené tickety, dnešní úkoly.
- **Klient = centrální entita:** detail klienta má záložky (Přehled, Služby, Domény, Faktury, Úkoly, Tickety, Aktivita; aktivní záložka v URL `?tab=`). Vše ostatní na něj odkazuje.
- **Routy, ne modály (fáze 33):** úprava, vytvoření, detail i akce (odeslání e-mailu, předání vizitky) mají vlastní routu s drobečky a šipkou zpět (`FormPage` + `FormActions`, na mobilu lepicí lišta s akcí). Menu a dropdowny jen navigují. Měkké mazání = hned + toast „Vrátit zpět" (`toastWithUndo`, u kolekcí bez archivu `deferredDelete`); nevratné akce = inline potvrzení (`ConfirmButton`). Výjimky: Cmd+K a mobilní navigační Sheet.
- Tabulky s filtrováním, multiselectem a archivem.
- **Jazyk UI: čeština.** Interní nástroj, žádná i18n.
- **Vizuální styl:** čistý, neutrální (shadcn default, zinc), SoloPixel akcent barva. Tmavý režim od začátku (snadné se shadcn).

## Vztah k ostatním SoloPixel projektům

- **spx-dbc** — produkt (vizitka), jehož instance SPX Core eviduje. Sdílí konvence (spec/ workflow, commit style).
- **solopixel-web** — marketing web; poptávky z /kontakt tečou do SPX Core jako kontakty v Oslovení (`/api/leads/intake`).

## Neobvyklé / důležité chování

- Role se řeší přes Firebase Auth **custom claims** (`role: admin | member | sales`) — nastavuje se server-side, klient je jen čte. Sales vidí **jen své klienty** (`salesOwnerUid == uid`) — v seznamu, detailu, ticketech, podkladech, vyhledávání i aktivitě. Oslovení (prospekti) zůstává sdílené. Auto-přiřazení: klient vytvořený sales uživatelem má automaticky `salesOwnerUid` tvůrce. Sales nemá přístup k financím (faktury, předplatná) — **výjimka:** vidí provize a předplatné svých klientů přes `/moje-vizitky`.
- **Provizní systém:** obchodník (sales) dostává doživotní podíl z každé zaplacené faktury svých klientů. Sazba = `users.commissionRate` ?? `settings/commission.defaultRate`. Provize vzniká automaticky při označení faktury jako zaplacené. Vlastníkem klienta může být kdokoli (i admin/member), ale provize vzniká jen vlastníkům s rolí sales.
- Registrace je **uzavřená** — uživatele zakládá admin, žádný veřejný signup.
- Čísla faktur generuje transakce nad počítadlem v dokumentu `counters/invoices` (formát `RRRR-NNN`).
