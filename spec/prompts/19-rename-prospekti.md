# Fáze 19 — Přejmenování „Prospekti" → „Oslovení"

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a Required Reading. Drobná UI fáze.

## Záměr

„Prospekti" je v češtině neobratné (prospekt = leták). Přejmenovat **jen viditelné UI texty** na **„Oslovení"**. Firestore kolekce `prospects`, názvy polí, typy, proměnné, API cesty a kód zůstávají beze změny — měníme pouze to, co vidí uživatel.

## Zadání

- **Sidebar**: položka „Prospekti" → **„Oslovení"** (sekce Obchod). Ikona beze změny.
- **Nadpisy a popisky stránek**: `/prospekti` (URL i route necháme) — PageHeader, prázdné stavy, tlačítka, dialogy, toasty: všude „Prospekti/prospekt/prospekta" → „Oslovení / kontakt k oslovení / kontakt". Volit přirozenou češtinu podle kontextu:
  - nadpis sekce: „Oslovení"
  - tlačítko „Nový prospekt" → „Přidat kontakt"
  - „Zabrat prospekta" → „Zabrat kontakt"
  - „Převést na lead" beze změny
  - prázdný stav: „Zatím žádné kontakty k oslovení"
- **Cmd+K, dashboard, aktivita, attention feed**: štítky/skupiny „Prospekti" → „Oslovení", texty typu „Kliknul na demo" beze změny.
- **Filtry stavů** prospekta (nový/osloven/reaguje…) beze změny — týkají se stavu, ne názvu sekce.
- **Co NEMĚNIT**: URL `/prospekti` (rename routy by rozbil uložené odkazy — necháme), kolekce `prospects`, schémata `lib/schemas/prospect*`, názvy proměnných/funkcí, API `/api/prospects*`, `activity.entityType = 'prospect'`.

## Postup

- Projít komponenty a stránky prospektů + místa, kde se prospekti zmiňují (sidebar, dashboard, cmd+K, aktivita, attention). Hledat viditelné stringy, ne identifikátory.
- `spec/context/project.md` a `data-model.md`: u kolekce `prospects` doplnit poznámku „v UI zobrazeno jako »Oslovení«", ať je vazba dohledatelná.

## Akceptační kritéria

- Nikde v UI se neobjeví „Prospekt/Prospekti"; všude „Oslovení / kontakt" v přirozené češtině.
- URL, kolekce, API a typy nezměněny — aplikace funguje identicky, jen jinak pojmenovaná.
- Lint + build čisté, vizuální kontrola, work-log, stav fáze, commit (`style: [changelog] přejmenování Prospekti → Oslovení`).
