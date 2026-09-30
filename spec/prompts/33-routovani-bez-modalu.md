# Fáze 33 — Migrace z modálů na routy (bez modálových oken)

## Stav

| Krok | Stav |
|---|---|
| 33A sdílené kameny (`FormPage`, `FormActions`, `ConfirmButton`, `toastWithUndo`, `deferredDelete`) | ✅ 1.12.0 |
| 33B detail klienta (úprava, nový klient i z Oslovení, odesílací akce, instance, domény, předplatné, zakázky, úkol/ticket) | ✅ 1.12.0 |
| 33E úkoly, 33F tickety (vč. detailu místo Sheetu) | ✅ 1.12.0 |
| 33C leady | ➖ odpadá (leady zrušené v 1.11.0) |
| 33I podklady | ➖ hotovo dřív (`/submissions/[id]`) |
| 33D Oslovení (formulář a import jako routy, zápis kontaktu a změna stavu jako rozbalovací panel) | ✅ 1.13.0 |
| 33G fakturace (export jako routa, smazání jako rozbalovací panel, storno inline potvrzením) | ✅ 1.13.0 |
| 33H email marketing (nový seznam jako routa, mazání a odeslání kampaně inline potvrzením) | ✅ 1.13.0 |
| 33J provize (výplata jako rozbalovací panel) | ✅ 1.13.0 |
| 33K nastavení (nový uživatel jako routa s dočasným heslem, trvalé smazání v archivu jako rozbalený řádek) | ✅ 1.13.0 |
| 33L úklid: `dialog.tsx` + `sheet.tsx` zůstávají jen pro výjimky (Cmd+K, mobilní nav); mrtvý `change-password-dialog` smazán (profil má formulář na stránce) | ✅ 1.13.0 |

## Cíl a princip

Napříč aplikací **nepoužívat modálová okna** (`Dialog`) pro detail, úpravu, vytvoření ani akce. Místo toho **vlastní routa** (Next.js App Router).

- **Layout:** plná stránka + tlačítko „Zpět", **stejně na desktopu i mobilu**. Minimalismus ve stylu iCloud (vzdušné, málo chromu, jasná primární akce dole/na konci formuláře).
- Mobil je první občan — plné routy fungují na mobilu přirozeně (žádné utržené dialogy, správné scrollování, nativní zpět).
- Rozcestníková **menu / popovery / dropdowny nejsou modaly** — zůstávají (např. „Poslat klientovi ▾", řádkové akce). Jen navigují na routy.

### Výjimky (ponechat jako ne-obsahové modaly), potvrzeno
- **Command palette (Cmd+K)** `components/command-search.tsx` — vyhledávací utilita (jako Spotlight). Ponechat.
- **Mobilní navigační Sheet** v `components/app-topbar.tsx` — navigace, ne obsah. Ponechat.

### Potvrzení destruktivních akcí bez modálu
- **Měkké mazání / archivace** (prospects, tickets, projects): provést hned + **sonner toast s akcí „Vrátit zpět"** (`toastWithUndo`). Žádný `confirm()`. Kolekce bez archivu (tasks) = `deferredDelete`: položka zmizí hned, DELETE až po zavření toastu.
- **Archivace klienta** = inline potvrzení: kaskádně archivuje služby a tickety a ruší předplatné, obnova klienta kaskádu nevrací, takže „Vrátit zpět" by nebylo pravdivé.
- **Nevratné akce** (trvalé smazání v archivu, smazání faktury / seznamu / šablony, storno): **inline potvrzení** — tlačítko se na místě rozbalí na „Opravdu? [Potvrdit] [Zrušit]". Ne modal.

## Konvence rout

- URL **anglicky**, konzistentně se stávajícími (`/new`, `/[id]/edit`). Nové: `/clients/[id]/edit`, `/clients/[id]/send/preview`, `/clients/[id]/instances/new` atd.
- Server komponenta (`page.tsx`) načte data přes Admin SDK → předá client form komponentě.
- Po úspěšném submitu: `router.push(<zpět>)` + `router.refresh()` + `toast.success(...)`.
- Zachovat role/guardy (sales jen vlastní klienty) a `revalidatePath`.

## 33A — Sdílené stavební kameny (nejdřív)

1. `components/form-page.tsx`: layout formulářové routy (drobečky se šipkou zpět, titulek, popis, `max-w-2xl`, `wide` pro náhledy).
2. `components/form-actions.tsx`: primární akce + „Zrušit"; na mobilu lepicí lišta dole, volitelná akce na opačném konci (smazání/archivace).
3. `components/confirm-button.tsx`: inline potvrzení (bez modálu) pro nevratné akce.
4. `lib/undo-toast.ts`: `toastWithUndo` (akce + „Vrátit zpět") a `deferredDelete` (odložené trvalé smazání).
5. Loadery rout: `lib/client-route.ts` (guard + drobečky klienta), `lib/ticket-route.ts`, `lib/form-options.ts`, `lib/subscription-data.ts`.

## 33B — Detail klienta (navazuje na rozdělanou práci)

| Modal dnes | Cílová routa |
|---|---|
| `client-form-dialog` (Upravit/Nový) | `/clients/new`, `/clients/[id]/edit` |
| `card-form-button` (formulář podkladů) | `/clients/[id]/send/form` |
| `marketing-email-dialog` (e-mail ze šablony) | `/clients/[id]/send/email` |
| `delivery-dialog` (předat vizitku) | `/clients/[id]/send/deliver` |
| `instances-tab` dialog | `/clients/[id]/instances/new`, `/instances/[instanceId]/edit` |
| `domains-tab` dialog (+ odebrání) | `/clients/[id]/domains/new`, `/domains/[domainId]/edit` (odebrání inline potvrzením) |
| `subscription-card` dialog | `/clients/[id]/subscriptions/new`, `/subscriptions/[subId]/edit` |
| `projects-section` dialog | `/clients/[id]/projects/new`, `/projects/[projectId]/edit` |
| `client-task-dialog` / `client-ticket-dialog` | reuse `/tasks/new?clientId=`, `/tickets/new?clientId=` |
| archivace (`confirm()`) | inline potvrzení (kaskáda není vratná) |

Akce na detailu jsou odkazy na `/clients/[id]/send/*`. Aktivní záložka v URL (`?tab=`), podstránky se na ni vracejí.

## 33C–33K — Zbytek po doménách

- **33C Leady:** `lead-form-dialog` → `/leads/new`, `/leads/[id]/edit`; `lead-detail-sheet` → nová routa `/leads/[id]`; „Důvod ztráty" jako krok/inline.
- **33D Oslovení:** `prospect-form-dialog` → `/prospects/new`, `/prospects/[id]/edit`; „Zapsat kontakt" → inline sekce na detailu; `csv-import-dialog` → `/prospects/import`; archivace → Undo.
- **33E Úkoly:** `tasks-page-client` create/edit → `/tasks/new`, `/tasks/[id]/edit`; mazání → Undo/inline.
- **33F Tickety:** create/edit → `/tickets/new`, `/tickets/[id]/edit`; `ticket detail sheet` → `/tickets/[id]`; mazání → Undo.
- **33G Fakturace:** „Smazat fakturu" → inline confirm; `invoice-export-dialog` → `/invoices/export`.
- **33H Email marketing:** „Nový seznam" → `/email-marketing/lists/new`; mazání seznamu/šablony → inline confirm; odeslání kampaně `confirm()` → inline potvrzení (na existující routě).
- **33I Podklady:** `submission detail sheet` → `/submissions/[id]`.
- **33J Provize:** „Označit jako vyplacené" → rozbalovací řádek / `/commissions/[id]/payout`.
- **33K Nastavení:** „Nový uživatel" → `/settings/users/new`; `change-password-dialog` → `/profile/password`; „Trvale smazat" (archiv) → inline confirm.

## 33L — Úklid

- Po odstranění všech obsahových modálů zvážit smazání `components/ui/dialog.tsx` / `sheet.tsx` (ponechat jen pokud je drží schválené výjimky).
- Aktualizovat kontext (`spec/context/project.md` — UI princip „routy, ne modaly"), verze, work-log.

## Pořadí a pravidla

- 33A → 33B (navazuje na rozdělané akční tlačítka) → dál po doménách.
- Každá pod-fáze = samostatný commit, čistý `lint` + `build`, bump verze, zápis do work-logu.
- Průběžně ověřovat na mobilní šířce (DevTools) — hlavní důvod migrace.

## Rozhodnutí

1. Výjimky Cmd+K a mobilní nav Sheet: ano.
2. Nevratné akce: inline potvrzení stačí.
3. URL anglicky: ano.
