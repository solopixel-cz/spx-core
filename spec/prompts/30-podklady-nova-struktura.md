# Fáze 30 — Podklady: nová struktura formuláře (sync výstupů + admin)

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec.
> **Companion k** `spx-web/spec/assign/zadani-formular-prestavba.md` — web mění formulář na 6 sekcí a **vnořený payload (`schemaVersion: 2`)**. Tohle zadání narovnává čtení v CRM, jinak se nové podklady nezobrazí. Nasadit ideálně současně s webem.
> Navazuje na fáze 9 (Podklady) a 29 (Kopírovat pro AI).

## Kontext a závazný tvar dat

Nový web zapisuje do `card-submissions/{token}` tuto strukturu (zdroj pravdy = kontrakt ve web zadání):

```jsonc
{
  "schemaVersion": 2,
  "token": "...",
  "basic":   { "fullName","ico","phone","email","companyBrand","customDomain","region" },
  "social":  { "youtube","instagram","tiktok","facebook","custom":[{"nazev","odkaz"}] },
  "services":{ "whatIDo","topServices","mainAction","mainActionNote","pricing" },
  "about":   { "text" },
  "pixela":  { "tone","address","ownWords" },
  "appearance": { "colors","notes" },
  "profileImageUrl": "...",
  "createdAt": "..."
}
```

`mainAction` ∈ `zavolat|poptavka|termin|jine` · `tone` ∈ `profesionalni|pratelska|energicka|humor` · `address` ∈ `vykani|tykani`.

**Zpětná kompatibilita:** starší záznamy jsou ploché (bez `schemaVersion`). CRM musí umět zobrazit **oba** tvary — nový (v2) i staré ploché (legacy). Rozlišuj podle `schemaVersion === 2`.

## Zadání

### 1. Normalizace čtení (`app/api/submissions/route.ts`)

- Zavést **view model** (jednotný tvar, který konzumuje detail i AI prompt) a mapovací funkci `normalizeSubmission(raw)`:
  - `schemaVersion === 2` → čti z vnořených sekcí.
  - jinak → legacy mapování ze současných plochých polí (zachovat dnešní chování pro staré záznamy).
- Napojení na klienta (token → clientId, fallback dle e-mailu) a filtr pro sales beze změny.

### 2. Zod schéma (`lib/schemas/card-submission.ts`)

- Přepsat na **v2** strukturu (vnořené sekce, viz kontrakt). Ponechat volitelný `schemaVersion`.
- Pokud je praktické, doplnit `legacyCardSubmissionSchema` pro staré ploché záznamy (jen pro typovou jistotu při čtení). Zdroj pravdy datového modelu doplnit i do `spec/context/data-model.md`.

### 3. Detail podkladu (`components/submissions/submissions-page-client.tsx`)

- Přepracovat detail Sheet na nové sekce: **Kontakt** (jméno, telefon, e-mail, firma/značka, region, vlastní doména, IČO), **Sociální sítě** (YouTube/Instagram/TikTok/Facebook + custom jako název → odkaz), **Co dělá** (čím se živí, 3 služby, hlavní akce čitelně, ceník), **O mně** (celý text), **Pixela** (tón čitelně, vykání/tykání, vlastními slovy), **Vzhled a poznámky**, **Vizitka** (profilová fotka).
- `mainAction` / `tone` / `address` zobrazuj **lidsky** (mapa kód → text, např. `zavolat` → „Zavolat mi", `profesionalni` → „Profesionální a věcná", `vykani` → „Vykání").
- Prázdná pole vynechávat (jako dnes `Field`). Legacy záznamy zobrazit ve starém rozvržení (nebo přes stejný view model).

### 4. AI Markdown (`lib/submission-prompt.ts`)

- Přegenerovat `buildSubmissionPrompt` na nové sekce. Sekce: `## Kontakt` (bez IČO!), `## Sociální sítě`, `## Co dělá`, `## O mně`, `## Jak má působit Pixela`, `## Vzhled a poznámky`, `## Vizitka`.
- **IČO nikdy nevypisovat** (pravidlo z fáze 29 platí dál).
- Kódy (`mainAction`, `tone`, `address`) převeď na čitelný text. Custom sítě vypiš jako `Název: odkaz`. Víceřádkové (`about.text`, `topServices`, `pricing`) zachovej s odřádkováním. Prázdná pole vynech.
- `SUBMISSION_PROMPT_INTRO` uprav, ať sedí na nový obsah (důraz na text „O mně" a tón Pixely).

### 5. Admin: detail + „Kopírovat pro AI" z kontaktu/klienta — DRAFT (k doladění)

> Tuto část ještě doladíme se zadavatelem — implementuj až po potvrzení. Poznámky:
- Cíl: detail vyplněného podkladu jde otevřít **po kliknutí na detail u kontaktu/klienta** a je tam tlačítko **„Kopírovat pro AI"** (Markdown pro AI codera).
- **Velká část už existuje:** tlačítko „Kopírovat pro AI" (fáze 29) a detail podkladu jsou dnes na stránce **Podklady**. Půjde tedy hlavně o **zpřístupnění téhož z detailu klienta** (a/nebo napojení „nový kontakt" → jeho podklad), ne o stavbu od nuly.
- **Otevřená otázka:** „nový kontakt" = detail klienta (`/klienti/[id]`), nebo prospekt v Oslovení? Podklad je vázaný na klienta (přes token → `clientId`), takže nejpravděpodobněji detail klienta. Potvrdit před implementací.

## Akceptační kritéria

- Nové podklady (`schemaVersion 2`) se v CRM správně zobrazí ve všech sekcích; staré ploché záznamy se nerozbijí.
- „Kopírovat pro AI" vytvoří Markdown v nové struktuře; **bez IČO**; kódy jsou čitelné; prázdná pole chybí.
- Sales vidí jen podklady vlastních klientů (beze změny).
- Lint + build čisté, ověření v prohlížeči na novém i starém záznamu, work-log, stav fáze, commit (`feat: podklady v2 — nová struktura formuláře v CRM`).
- (Admin část ze § 5 až po potvrzení zadavatelem.)
