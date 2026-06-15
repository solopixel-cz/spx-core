# Fáze 29 — Kopírovat podklad pro AI

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec.
> Navazuje na fázi 9 (Podklady z formuláře). Týká se detailu podkladu v `components/submissions/submissions-page-client.tsx`.
> Doporučené pořadí: spustit až po fázi 28 (jiné soubory, ale ať se nepřekrývají session).
> **Žádná nová data ani API** — jen nová UI akce + helper pro sestavení textu.

## Záměr

Vizitky tvoří AI (Claude) z podkladů, které poradce vyplní ve formuláři. Dnes je obsluha musí z detailu přepisovat ručně. Cíl: v detailu vyplněného podkladu jedno tlačítko **„Kopírovat pro AI"**, které dá do schránky **kompletní prompt** — úvodní instrukci + všechna data podkladu v přehledném Markdownu — připravený k vložení Claudovi, který vizitku vygeneruje.

Klíčové pravidlo: do výstupu jde **vše kromě IČO** (`companyId`). IČO je jen administrativní údaj, pro generování vizitky nepotřebný.

## Zadání

### 1. Helper `buildSubmissionPrompt` (`lib/submission-prompt.ts`)

- Funkce `buildSubmissionPrompt(submission): string` — vrátí hotový text (Markdown) = úvodní instrukce + datové sekce.
- **Úvodní instrukce** (konstanta `SUBMISSION_PROMPT_INTRO`), např.:

  > Na základě následujících podkladů od finančního poradce vytvoř obsah jeho digitální vizitky SoloPixel (profil, bio, sekce služeb a zaměření). Vycházej výhradně z uvedených údajů, nic si nedomýšlej. Co není vyplněné, vynech.

  (Text drž jako editovatelnou konstantu na jednom místě; případné pozdější přesunutí do nastavení je mimo rozsah této fáze.)
- **Datové sekce** v Markdownu, nadpisy `##`, pole jako `**Štítek:** hodnota`. Seskupení jako v detailu:
  - **Kontakt:** Jméno (`fullName`), E-mail, Telefon, Adresa (`officeAddress`), Město. — **bez IČO.**
  - **Profese:** Specializace, Praxe (roky), Počet klientů, ČNB zkoušky, Zaměření, Typy klientů.
  - **Profil:** Bio, Důvody, Hlavní jazyk, Další jazyky.
  - **Vizitka:** Vlastní doména, Profilová fotka (URL `profileImageUrl`).
- **Vynechat prázdná pole** (stejná logika jako komponenta `Field` — když není hodnota, řádek se neukáže). Pole `companyId` (IČO) nevypisovat nikdy.
- Pole typu pole (arrays) spojit čárkou (`focusAreas`, `cnbExams`, `clientTypes`, `availableLanguages`), `reasons` středníkem; čísla převést na text; `bio` ponechat víceřádkové.

### 2. Tlačítko „Kopírovat pro AI" v detailu podkladu

- V `submissions-page-client.tsx`, v detail Sheetu, přidat tlačítko **„Kopírovat pro AI"** (ikona `Copy` z lucide). Umístit nahoru do detailu (např. pod hlavičku s jménem/badge, nad první `Separator`), ať je vždy po ruce bez scrollování.
- Onclick: `await navigator.clipboard.writeText(buildSubmissionPrompt(selected))` → `toast.success("Podklady zkopírovány pro AI")`. Při chybě (`catch`) `toast.error("Nepodařilo se zkopírovat")`.
- Tlačítko je dostupné u každého podkladu (nového i zpracovaného), nezávisle na stavu.

### 3. Drobnost

- Pokud `navigator.clipboard` není dostupné (nezabezpečený kontext), zobrazit srozumitelný `toast.error`. Žádný složitý fallback netřeba.

## Akceptační kritéria

- V detailu libovolného podkladu je tlačítko „Kopírovat pro AI"; po kliknutí je ve schránce Markdown prompt s úvodní instrukcí a všemi vyplněnými údaji.
- Ve výstupu **není IČO**; prázdná pole chybí; pole/čísla jsou čitelně naformátované.
- Toast potvrdí úspěch/chybu.
- Lint + build čisté, ověření v prohlížeči (zkopírovat a vložit do editoru, zkontrolovat obsah), work-log, stav fáze, commit (`feat: kopírování podkladu jako AI prompt z detailu`).
