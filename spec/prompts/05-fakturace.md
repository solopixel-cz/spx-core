# Fáze 5 — Fakturace a předplatné

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 4.

## Zadání

Evidence předplatných a faktur. Kolekce `subscriptions`, `invoices`, `counters` dle `spec/context/data-model.md`. Žádné platební brány — jen evidence (platby chodí převodem).

### 1. Předplatné

- Na detailu klienta, záložka Přehled: karta předplatného (tarif, cena, cyklus, stav, příští fakturace) + dialog založení/úpravy.
- Tarify natvrdo v `lib/plans.ts` (basic/standard/premium s výchozí cenou, cena editovatelná per klient).

### 2. Faktury (`/fakturace`)

- Tabulka všech faktur: číslo, klient, částka, vystaveno, splatnost, stav (badge — overdue červeně). Filtry stav/klient, řazení dle splatnosti.
- „Nová faktura" — dialog: klient, částka (předvyplní z předplatného), splatnost (+14 dní default). Číslo `RRRR-NNN` z transakce nad `counters/invoices`.
- Akce na řádku: Označit zaplaceno (nastaví `paidAt`), Stornovat, Stáhnout PDF (zatím disabled s tooltipem „připravujeme").
- Stav `overdue` se odvozuje při čtení (`status==='sent' && dueAt < now`) — žádný cron.
- Záložka Faktury na detailu klienta — stejná tabulka filtrovaná na klienta.

### 3. Přehled splatností

- Nahoře na `/fakturace` tři karty: Po splatnosti (počet + suma), Tento měsíc vystaveno, Tento měsíc zaplaceno.

### 4. Rules + indexy

- Mutace jen přes route handlers (admin SDK). Index `invoices(status, dueAt)`.

## Akceptační kritéria

- Číslování faktur je sekvenční i při souběhu (transakce), rok se přepíná správně.
- Faktura po splatnosti se ukazuje jako overdue bez zásahu.
- Lint + build čisté, ověření v prohlížeči, work-log, stav fáze, commit (`feat: [changelog] fakturace a předplatné`).
