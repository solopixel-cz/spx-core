# Zadání: Web pro regionální kancelář finančních poradců (šablona)

Zadal: hlavní vlákno (CEO + CMO + CTO + HeadDesign), Lukáš 3. 11. 2026 · Tabule **#26** · Staví: **Karel** přes Claude Code · Nové repo `solopixel-cz/spx-office` (Next.js) · Režim: bez dozoru, zastav před PR do `main`

## Proč
Regionální kanceláře finančních poradců potřebují jeden společný web, na kterém:
1. **získávají klienty** (služby, kalkulačky, kontakt na správného poradce),
2. **nabírají nové poradce** (kariéra, přihláška),
3. **představují tým**: každý poradce má kartu s odkazem na svou digitální vizitku SoloPixel.

Nestavíme web pro jednu kancelář, ale **šablonu**. Novou kancelář má jít spustit **do jednoho pracovního dne**: zkopírovat konfiguraci, doplnit texty, fotky a logo, nastavit doménu. Žádné úpravy kódu.

## Technika
- **Next.js 16 (App Router), TypeScript, Tailwind**, nasazení na Vercel, region `fra1`. Stack drž co nejblíž `spx-dbc`, ať jde kód přenášet.
- **Jedna kódová základna, víc kanceláří.** Kancelář vybírá env `OFFICE_SLUG`, stejně jako `ADVISOR_SLUG` ve `spx-dbc`. Data jsou v `offices/{slug}/office.json`, fotky v `public/offices/{slug}/`. Konfiguraci validovat přes **zod** při buildu. Chybějící povinné pole build zastaví se srozumitelnou chybou.
- **Bez databáze v první verzi.** Formuláře odcházejí e-mailem (Resend). Volitelně i na webhook z konfigurace kanceláře, aby šlo později napojit CRM.
- **Ukázková kancelář** `demo` s **vymyšlenou značkou** (např. „Finanční kancelář Vzor, Ostrava“) a vymyšlenými poradci a fotkami (generické nebo ilustrační, s licencí). **Žádná loga ani názvy skutečných společností** (ZFP ani jiné). Skutečnou značku dodá až konkrétní kancelář.
- Větve: `main` (prázdný start), práce v `devel` a feature větvích. Pravidla repa (`CLAUDE.md`, progress, work-log, CHANGELOG) založ podle vzoru `spx-dbc`.

## Konfigurace kanceláře (`office.json`, hlavní pole)
- `name`, `region`, `claim`, `logo`, `logoDark`, `primaryColor`, `accentColor`, `font` (výběr ze 2–3 předpřipravených dvojic),
- `contact`: telefon, e-mail kanceláře, `leadEmail` (kam chodí poptávky), `recruitEmail` (kam chodí přihlášky), `webhookUrl?`,
- `offices[]`: pobočky (adresa, otevírací doba, souřadnice, odkaz na Mapy.cz),
- `stats[]`: nepovinná čísla od kanceláře (žádná výchozí ani vymyšlená čísla),
- `services[]`: id, název, krátký popis, ikona, body, kalkulačka (nepovinně),
- `advisors[]`:
  - `slug`, jméno, titul, foto, role, `specializations[]`, `cities[]`, telefon, e-mail,
  - `vizitkaUrl` (odkaz na vizitku SoloPixel), `featured?`,
- `career`: zapnuto/vypnuto, texty, kroky začátku, benefity, FAQ,
- `legal`: blok „Informace o zprostředkovateli“ (status, registrace ČNB s odkazem do registru, pod kým poradci působí, stížnosti, finanční arbitr), zásady ochrany osobních údajů, cookies,
- `analytics`: GA4 ID (nepovinné),
- `seo`: title, popis, OG obrázek.

## Stránky a sekce
1. **Úvod `/`**
   - hero: název kanceláře, region, claim, 2 tlačítka **„Domluvit schůzku“** a **„Přidejte se k nám“** (to druhé jen pokud je zapnutá kariéra),
   - čísla (pokud jsou v konfiguraci), přehled služeb, 3–6 doporučených poradců, upoutávka na kariéru, kontakt.
2. **Služby `/sluzby` a `/sluzby/[id]`**
   - pojištění, investice, penze, hypotéky, úvěry, podle konfigurace,
   - každá služba: k čemu je, co poradce udělá, kalkulačka (je-li), seznam poradců s touto specializací, výzva ke kontaktu.
3. **Tým `/tym`**
   - mřížka karet poradců: foto, jméno, role, specializace, města,
   - filtr podle **specializace** a **města**, plus vyhledávání podle jména,
   - karta poradce: tlačítka **„Vizitka“** (otevře `vizitkaUrl`), **„Zavolat“** a **„Napsat“**,
   - **žádné samostatné profilové stránky poradců.** Profil poradce je jeho vizitka SoloPixel. Web na ni posílá a neduplikuje ji.
4. **Kalkulačky `/kalkulacky`**
   - hypotéka, penze, investice, **převzaté ze `spx-dbc`**.
   - **Pozor:** ve `spx-dbc` běží validace kalkulaček (`spec/assign/zadani-validace-kalkulacky-claude-code.md`). Na jedné vizitce byla nalezena **pevně napsaná „úspora až 438 812 Kč“**, která nevychází z výpočtu. **Žádné pevné výsledky.** Vše počítat ze vstupů a mít to otestované.
   - pod výsledkem: „Chcete to probrat s poradcem?“ a krátký formulář, který pošle i zadané hodnoty.
5. **Kariéra `/kariera`** (jen když `career.enabled`)
   - proč k nám, pro koho to je, jak vypadá začátek (kroky), co nabízíme, FAQ,
   - **přihláška**:
     - jméno, telefon, e-mail, město,
     - zkušenosti ve financích (žádné / do 1 roku / víc),
     - odkaz na LinkedIn (nepovinné), zpráva,
     - souhlas,
   - odeslání → e-mail na `recruitEmail`.
   - Tón: **vykat**, střízlivě, bez slibů výdělků a bez „buď svým pánem“ (vyhnout se dojmu MLM).
6. **Kontakt `/kontakt`**
   - pobočky s adresou, otevírací dobou a odkazem na Mapy.cz (**statický obrázek mapy nebo odkaz, žádný iframe s cookies**),
   - formulář:
     - jméno, telefon, e-mail, téma (výběr ze služeb),
     - nepovinně „Mám už svého poradce“ (výběr z týmu) a město,
     - zpráva, souhlas,
   - **Směrování:** když klient vybere poradce, e-mail jde jemu a kopie na `leadEmail`. Jinak jde jen na `leadEmail`.
7. **Právní stránky:** `/informace-o-zprostredkovateli`, `/ochrana-osobnich-udaju`, `/cookies`, texty z `legal`. Odkaz na ně v patičce na každé stránce.
8. **404** v designu webu.

## Formuláře (společné)
- Validace na klientu i serveru (zod), honeypot, rate limit (jako `service-request` ve `spx-dbc`), sanitizace.
- UTM a `landing_page` posílat s formulářem (uložit při prvním načtení do `sessionStorage`, čtení v try/catch).
- E-mail přes Resend: čitelná tabulka, odkaz `tel:`/`mailto:`, zdroj. Když je vyplněný `webhookUrl`, odeslat JSON i tam. Selhání webhooku nesmí zablokovat e-mail.
- Po odeslání poděkování: „Ozveme se Vám do 2 pracovních dnů.“ Lhůta je konfigurovatelná.
- **Souhlas:** text s názvem kanceláře jako správce a odkazem na zásady. Uložit text souhlasu a čas do e-mailu nebo webhooku.

## Design (HeadDesign)
- Seriózní, klidný, moderní, ne „bankovní šedá“. **Mobil first** (375 px je hlavní případ), desktop 1440 px.
- Barvy a logo z konfigurace přes CSS proměnné. Kontrast WCAG AA ověřit i pro barvy kanceláře, při nízkém kontrastu automaticky ztmavit text tlačítek.
- Velké fotky lidí. Tým je hlavní argument důvěry.
- Komponenty karet, tlačítek a formulářů ladit se stylem vizitek SoloPixel, aby přechod z webu na vizitku poradce nepůsobil jako jiný svět.
- V patičce nenápadně **„Web od SoloPixel“** s odkazem na solopixel.cz.
- Přístupnost: klávesnice, focus stavy, alt texty, správné nadpisy, `prefers-reduced-motion`.

## SEO, výkon, měření
- `generateMetadata` pro každou stránku, OG obrázky, `sitemap.xml`, `robots.txt`.
- JSON-LD: `FinancialService` / `LocalBusiness` pro kancelář a pobočky, `Person` u poradců (s `sameAs` na vizitku).
- Lighthouse mobil: Performance ≥ 90, Accessibility ≥ 95, SEO 100. Obrázky přes `next/image`.
- **GA4 až po souhlasu.** Lišta souhlasu minimalistická, tlačítko „Nepovolit“ stejně snadné jako „Povolit“ (stejný princip jako nový souhlas na vizitkách, `fix/cookies-souhlas` ve `spx-dbc`).
- Události:
  - `lead_submit` (parametry `topic`, `advisor`),
  - `recruit_submit`,
  - `calculator_use` (`type`),
  - `vizitka_click` (`advisor`),
  - `phone_click`, `email_click`.

## Dokumentace pro opakované použití
`README.md` → sekce **„Nová kancelář za jeden den“**:
1. zkopírovat `offices/demo`,
2. vyplnit `office.json` (seznam povinných polí),
3. nahrát fotky (rozměry, formát),
4. Vercel projekt s `OFFICE_SLUG`, env (`RESEND_API_KEY`, odesílací doména),
5. doména,
6. kontrolní seznam před spuštěním: právní texty od kanceláře, testovací formuláře, GA, Lighthouse.

## Mimo rozsah první verze
- Akce, semináře, blog.
- Reference a hodnocení z HUBu (plánováno do v2 přes veřejná API hubu).
- Vícejazyčnost.
- Administrace obsahu (obsah se mění v `office.json`).
- Databáze poptávek.

## Hotovo, když
- [ ] Repo `spx-office` s `CLAUDE.md`, progress, work-log a CHANGELOG. Konfigurace validovaná zodem.
- [ ] Ukázková kancelář `demo` (vymyšlená značka) se všemi stránkami, 8–12 poradci a 2 pobočkami.
- [ ] Filtr týmu, odkazy na vizitky, kalkulačky bez pevných čísel s testy výpočtů.
- [ ] Oba formuláře (klient, nábor) chodí e-mailem, směrování na poradce funguje, webhook volitelně, honeypot a rate limit.
- [ ] Právní stránky z konfigurace. Souhlas s cookies a GA až po souhlasu.
- [ ] Druhá testovací kancelář (`demo2`, jiné barvy, logo, kariéra vypnutá) se postaví **bez změny kódu**. To je hlavní důkaz šablony.
- [ ] `tsc`, `lint`, `build` zelené. Lighthouse podle cílů. Screenshoty 375 a 1440 px (obě dema).
- [ ] README „Nová kancelář za jeden den“. Push → Vercel preview. **Zastav před PR do `main`** a do progress napiš odkazy na preview.
