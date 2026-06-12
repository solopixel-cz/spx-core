# Fáze 4 — Leady a pipeline

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 3.

## Zadání

Obchodní pipeline s kanbanem. Kolekce `leads` dle `spec/context/data-model.md`.

### 1. Kanban (`/leady`)

- Sloupce dle `stage`: Nový, Osloven, Demo, Nabídka, Smlouva, Onboarding. (won/lost se zobrazují mimo board — viz níže.)
- Karta: jméno, firma, hodnota, zdroj (badge), vlastník (avatar), stáří ve fázi.
- Drag & drop mezi sloupci (`@dnd-kit/core`) → optimistický update, zápis `stage` klientským SDK + realtime `onSnapshot` listener, takže změny kolegů jsou vidět živě. `logActivity()` o změně fáze přes route handler.
- Přepínač Kanban / Tabulka (tabulka: TanStack, filtry stage/zdroj/vlastník, zahrnuje won/lost).

### 2. Detail leadu

- Sheet (boční panel) z karty: všechna pole, editace, aktivita + poznámky (stejný vzor jako klient).
- Akce **„Vyhráno"** → transakce: lead.stage=won, vytvoří `client` (přenese kontakty, `leadId`), vygeneruje onboarding úkoly ze šablony `templates/onboarding` (pokud existuje; jinak přeskočí s toastem), redirect na detail nového klienta.
- Akce **„Ztraceno"** → dialog s povinným `lostReason`.

### 3. Nový lead

- Dialog: jméno, firma, kontakty, zdroj, hodnota, vlastník (select z `users`).

### 4. Rules + indexy

- `leads`: update `stage` povolen přihlášeným (klientský drag&drop), ostatní zápisy přes route handlers.
- Přidej index `leads(stage, updatedAt)` do `firestore.indexes.json`.

## Akceptační kritéria

- Drag & drop funguje, změna je vidět ve druhém okně prohlížeče (realtime).
- Konverze Vyhráno vytvoří klienta + úkoly; Ztraceno vyžaduje důvod.
- Lint + build čisté, ověření v prohlížeči, work-log, stav fáze, commit (`feat: [changelog] pipeline leadů s kanbanem`).
