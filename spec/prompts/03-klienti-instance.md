# Fáze 3 — Klienti a DBC instance

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 2.

## Zadání

Modul Klienti — centrální entita CRM. Drž se kolekcí `clients`, `instances`, `activity` ze `spec/context/data-model.md`.

### 1. Seznam klientů (`/klienti`)

- TanStack Table: jméno, firma, e-mail, stav (badge), slug, počet instancí, poslední aktivita.
- Fulltext filtr (klientsky nad načtenými daty — objem je malý), filtr dle stavu.
- Tlačítko „Nový klient" → dialog s formulářem (react-hook-form + zod schéma).
- Data čte Server Component přes admin SDK; mutace přes route handlers (`POST/PATCH /api/clients`).

### 2. Detail klienta (`/klienti/[id]`)

- Hlavička: jméno, firma, stav, kontakty, akce Upravit.
- Záložky (shadcn Tabs):
  - **Přehled** — kontakty, poznámky, klíčové metriky (otevřené úkoly/tickety, stav předplatného — placeholdery, naplní fáze 5/6).
  - **Instance** — tabulka instancí klienta + dialog přidání/úpravy (doména, slug, stav, verze, features, repo/deploy URL). Odkaz na živou vizitku.
  - **Faktury, Úkoly, Tickety** — placeholder záložky („Doplní fáze 5/6").
  - **Aktivita** — timeline z kolekce `activity` (filtr na entityType=client) + pole „Přidat poznámku".

### 3. Aktivita

- `lib/activity.ts` — helper `logActivity()` volaný ze všech mutací (vytvoření klienta, změna stavu, nová instance…). Append-only.

### 4. Rules

- Otevři zápis pro `clients`, `instances` přes route handlers (admin SDK obchází rules — rules nastav pro budoucí klientské zápisy konzervativně: deny). `activity` create pro přihlášené, no update/delete.

## Akceptační kritéria

- CRUD klienta i instance funguje proti emulátoru, aktivita se loguje a zobrazuje.
- Detail klienta naviguje mezi záložkami, prázdné stavy mají smysluplné texty česky.
- Lint + build čisté, ověření v prohlížeči, work-log, stav fáze, commit (`feat: [changelog] modul klienti a instance`).
