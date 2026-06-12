# Fáze 6 — Úkoly, tickety a dashboard

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 5.

## Zadání

Poslední moduly: úkoly s onboarding šablonami, tickety (bugy + požadavky na změnu) a dashboard. Kolekce `tasks`, `tickets`, `templates/onboarding` dle `spec/context/data-model.md`.

### 1. Úkoly (`/ukoly`)

- Seznam: Moje / Všechny, filtr stav + klient, řazení dle termínu, overdue zvýrazněně.
- Checkbox dokončení s optimistickým updatem (klientský SDK), ostatní mutace přes route handlers.
- Dialog nového úkolu: titul, popis, klient/lead (volitelné), řešitel, termín.
- Záložka Úkoly na detailu klienta.
- **Onboarding šablona:** správa v `/nastaveni/sablony` — kroky `{ title, offsetDays }`. (Konverze leadu z fáze 4 už šablonu používá — ověř integraci.)

### 2. Tickety (`/tickety`)

- Tabulka: typ (badge bug/změna), titul, klient, priorita, stav, řešitel, stáří. Filtry stav/typ/priorita/klient.
- Dialog nového ticketu: klient, instance (select dle klienta), typ, titul, popis, priorita, přílohy (upload do Storage, max 10 MB, obrázky/PDF).
- Detail v Sheet: pole + změna stavu (open → in_progress → waiting_client → resolved → closed), komentáře přes `activity` (entityType=ticket), přílohy ke stažení.
- Realtime listener na seznamu (změny stavů jsou vidět živě).
- Záložka Tickety na detailu klienta + napojení metrik na záložce Přehled (počty otevřených úkolů/ticketů — nahraď placeholdery z fáze 3).

### 3. Dashboard (`/`)

- Karty: leady dle fáze (mini funnel), faktury po splatnosti, otevřené tickety dle priority, moje dnešní + overdue úkoly.
- Vše proklikem vede do příslušného modulu s předfiltrováním.

### 4. Rules + indexy

- `tasks.status` update pro přihlášené, `tickets` create/update pro přihlášené (komentáře přes activity), Storage rules: čtení přihlášení, zápis do `tickets/{ticketId}/` max 10 MB.
- Indexy: `tasks(assigneeUid, status, dueAt)`, `tickets(status, priority)`.

## Akceptační kritéria

- Onboarding úkoly se generují při výhře leadu s termíny dle offsetDays.
- Ticket s přílohou projde celým životním cyklem, vše vidět realtime.
- Dashboard ukazuje živá čísla a prokliky fungují.
- Lint + build čisté, ověření v prohlížeči, work-log, stav fáze, commit (`feat: [changelog] úkoly, tickety a dashboard`).
