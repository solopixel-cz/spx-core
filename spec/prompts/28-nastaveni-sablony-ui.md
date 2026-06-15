# Fáze 28 — Nastavení: přestavba šablon (UI)

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec.
> Navazuje na fázi 21 (rozcestník nastavení), 22 (šablona oslovení) a 27 (šablona předání vizitky).
> **Žádná nová data ani API** — jen reorganizace UI a přesun existujících sekcí. Stávající endpointy (`/api/templates/onboarding`, `/api/templates/outreach-email`, `/api/templates/delivery-email`, `/api/settings/commission`) zůstávají beze změny.

## Problém

Stránka `/nastaveni/sablony` dnes míchá na jednom dlouhém scrollu čtyři nesouvisející věci:

1. **Onboarding šablona** (checklist → úkoly)
2. **Šablona oslovení** (předmět + 600px náhled v iframe)
3. **Šablona předání vizitky** (předmět + 600px náhled v iframe)
4. **Výchozí sazba provize**

Dva náhledové iframy po 600 px dělají ze stránky obří roletu. „Provize" ani „Onboarding" navíc logicky nepatří pod název „Šablony". Dlaždice na rozcestníku má zastaralý popis.

## Cílový stav

- `/nastaveni/sablony` = **výhradně e-mailové šablony**, přepínané záložkami **Oslovení | Předání vizitky**, náhled v **modalu** (ne stálý iframe). Krátká, přehledná stránka.
- **Onboarding šablona** → vlastní podstránka.
- **Výchozí sazba provize** → na stránku `/provize`.
- Rozcestník aktualizovaný a vedoucí na vše.

## Zadání

### 1. Stránka E-mailové šablony (`/nastaveni/sablony`)

- Obsahuje výhradně e-mailové šablony. Odstranit z ní onboarding i provizi (přesun viz § 2 a § 3).
- Nahoře **záložky (shadcn `Tabs`)**: `Oslovení` | `Předání vizitky`.
- Pod taby editor vybrané šablony:
  - Pole **Předmět** (`Input`) + nápověda k placeholderům `{{jmeno}}` (oslovení, 5. pád) a `{{odkaz}}`.
  - Tlačítka: **Náhled** (otevře modal), **Testovací e-mail**, **Uložit**.
  - Poznámka, že tělo e-mailu je ve fixním brandingu SoloPixel.
- **Náhled = modal** (shadcn `Dialog`, širší, např. `max-w-3xl`): uvnitř iframe s renderem dané šablony (`renderOutreachEmail` / `renderDeliveryEmail`) a ukázkovými daty (`jmeno: "Jane"`, `odkaz: "https://demo.solopixel.cz"`).
- **Refactor proti duplicitě:** vyextrahovat sdílenou komponentu `EmailTemplateEditor` (props: `apiPath`, `renderEmail`, `defaultSubject`, `placeholderHint`, `sampleVars`, `label`). Obě záložky ji jen instancují s jinými parametry. Stav (`loading`/`saving`/`sendingTest`) drží komponenta sama.
- Chování ukládání a testovacího e-mailu zůstává shodné se současným (PUT pro uložení předmětu, POST pro test).

### 2. Onboarding šablona → vlastní podstránka

- Nová stránka **`/nastaveni/onboarding`** (admin) — přesunout sem celou onboarding sekci: editor kroků (`steps`), `addStep` / `removeStep` / `updateStep`, načítání i ukládání přes `/api/templates/onboarding`. Beze změny logiky.
- Zachovat popisek („Kroky se vygenerují jako úkoly při výhře leadu. Offset = počet dní od konverze.").

### 3. Výchozí sazba provize → `/provize`

- Přesunout editaci výchozí sazby (`/api/settings/commission`) z `/nastaveni/sablony` na stránku **`/provize`** jako **admin-only** kartu nahoře (např. „Nastavení provizí — výchozí sazba"). Logika beze změny (číslo v %, PUT `defaultRate`).
- Respektovat roli: member/sales tuto kartu nevidí (řídit dle `user.role`, stejně jako dnes admin-only).

### 4. Rozcestník (`/nastaveni`)

- Dlaždici **„Šablony"** přejmenovat na **„E-mailové šablony"**, popis: „E-maily pro oslovení a předání vizitky". Ikona může zůstat (`FileText`).
- Přidat dlaždici **„Onboarding"** → `/nastaveni/onboarding` (admin), popis „Checklist úkolů, který se vytvoří při výhře leadu".
- Dlaždice **„Provize"** (`/provize`) — doplnit do popisu, že obsahuje i výchozí sazbu.
- Odstranit zastaralou zmínku o provizi/onboardingu z popisu šablon.

### 5. Navigace / sidebar

- Ověřit, že na `/nastaveni/onboarding` a na přesunutou sazbu provize vede odkaz z rozcestníku — nic nesmí zůstat dostupné jen přímou URL.

## Akceptační kritéria

- `/nastaveni/sablony` obsahuje jen e-mailové šablony s taby Oslovení / Předání; náhled se otevírá v modalu; stránka je krátká.
- Onboarding šablona plně funguje na `/nastaveni/onboarding`; výchozí sazba provize plně funguje na `/provize` a vidí ji jen admin.
- Rozcestník vede na E-mailové šablony, Onboarding, Uživatele, Archiv, Provize a Profil; popisy jsou aktuální; dlaždice respektují role.
- E-mailové šablony nejsou duplikovaný kód — sdílí `EmailTemplateEditor`.
- Lint + build čisté, ověření v prohlížeči jako admin i member, work-log, stav fáze, commit (`refactor: přehlednější nastavení — e-mailové šablony do tabů, onboarding a provize zvlášť`).
