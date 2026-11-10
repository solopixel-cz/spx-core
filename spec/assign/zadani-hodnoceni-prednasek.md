# Zadání: Hodnocení přednášek (pro lektory a řečníky)

Zadal: hlavní vlákno (CEO + CMO + CTO + HeadDesign), schválil Lukáš 3. 11. 2026 · Tabule **#25** · Repa `spx-core`, `spx-hub`, `spx-dbc` (stejný soubor ve všech třech) · Režim: **bez dozoru**, před PR do `main` zastav

## Proč
Lektoři a řečníci (segment `/cs/pro/recniky` na solopixel.cz) nemají nezávislý důkaz, že přednáší dobře. Lektor si v HUBu založí přednášku a dostane odkaz s QR, který dá na poslední slajd. Posluchači naskenují QR a dostanou se na jeho vizitku, kde přednášku do 30 vteřin ohodnotí. Na vizitce se pak ukazuje **souhrn, který lektor nemůže upravit**. Volitelně mu posluchači nechají kontakt.

**Hodnocení přednášek nejsou reference.** Reference jsou od klientů o spolupráci, hodnocení od posluchačů o přednášce. Data, výpočty i zobrazení drž **odděleně**. Infrastrukturu referencí ale **znovu použij**: tokeny a odkazy, QR, limity proti spamu (`lib/reference-limits.ts`), audit (`lib/audit.ts`), signály důvěry a odpověď vlastníka z `feat/reference-duvera`. Kde to jde, vytáhni společný kód do sdílených helperů. Nekopíruj.

## Výchozí stav a větve
- `feat/reference-duvera` (důvěra referencí a odpověď vlastníka) **zatím není v `main` ani v `devel`** ve všech třech repech.
- Nové větve `feat/hodnoceni-prednasek`: založ z `devel`. Pokud v `devel` ještě není `feat/reference-duvera`, založ z `feat/reference-duvera`. Do progress zapiš, z čeho jsi vycházel.
- Rozpracované větve ostatních agentů nech být.

## Rozhodnutí (Lukáš 3. 11.)
- **Škála:** 1–5 hvězd jako celkový dojem, plus dvě rychlé otázky.
- **Zapnutí:** nová funkce HUBu `lectures` („Hodnocení přednášek“), tým ji zapíná u klienta v CRM. Do kterého tarifu nebo doplňku patří, rozhodne CFO později. **Kód ji neváže na tarif.**
- **Sběr kontaktů posluchačů je v první verzi zapnutý** (volitelný pro posluchače, se souhlasem).

## 1. spx-core (CRM)
- `lib/hub-features.ts`: do `HUB_FEATURES` přidat `lectures: "Hodnocení přednášek"`. Přepínač v detailu klienta funguje jako u Referencí.
- `firestore.rules`: nové kolekce jsou jen pro admin SDK (`if false` pro klienty), stejně jako hub kolekce.
- Kontakty od posluchačů se v CRM **nezakládají**. Patří lektorovi, ne SoloPixelu. Zobrazí se jen v HUBu lektora.

## 2. spx-hub: datový model a API

**Přednáška** (`lectures`):
- `clientId`, `title` (max 120 znaků), `date`, `organizer` (nepovinné), `place` (nepovinné), `expectedAudience` (nepovinné číslo),
- `materialsUrl` nebo nahrané PDF (nepovinné, max 20 MB),
- `token` (krátký, nehádatelný, pro `/h/[token]`),
- `opensAt` = den přednášky 00:00, `closesAt` = **3 dny po přednášce 23:59** (Europe/Prague),
- `status: draft | open | closed | hidden`, `createdAt`.

**Hodnocení** (`lectureRatings`):
- `lectureId`,
- `stars` 1–5 (povinné),
- `takeaway: yes | partly | no` („Odnesl/a jsem si něco, co použiju“),
- `recommend: yes | no` („Doporučil/a bych přednášku dalším“),
- `comment` (nepovinné, max 1 000 znaků, bez odkazů a HTML),
- `name` (nepovinné, jinak „Anonymní posluchač“; zobrazovat zkráceně jako u referencí),
- `contact` (nepovinné: e-mail nebo telefon) se souhlasem `{ text, at }`,
- `deviceHash`, `ipHash` (jen hash, nikdy plain IP),
- `trust` (signály a úroveň podle `feat/reference-duvera`),
- `commentHidden: boolean`, `reply` (stejný model jako odpověď vlastníka u referencí),
- `createdAt`.

**Veřejný sběr `/h/[token]`** (route v hubu stejně jako `/p` a `/r`):
- Přesměruje na vizitku klienta `{vizitka}/#prednasky?h={token}` nebo ekvivalent, který TabSystem umí. Formulář je na vizitce, odeslání jde na API hubu.
- Mimo okno `opensAt`–`closesAt`: vizitka ukáže „Hodnocení této přednášky už je uzavřené. Děkujeme.“ a výsledky, pokud jsou zveřejněné.

**API**
- `POST /api/public/lectures/[token]/ratings`:
  - honeypot,
  - limity podle `reference-limits` (na IP, zařízení a token),
  - **1 hodnocení z jednoho zařízení na přednášku** (cookie + `deviceHash`; druhý pokus vrátí „Tuto přednášku už jste hodnotil/a“),
  - zavřená přednáška vrací 410,
  - CORS jen pro domény vizitek, stejně jako veřejné API referencí.
- `GET /api/public/lectures/[slug]`: souhrn a zveřejněné přednášky pro vizitku, ve tvaru a s cache jako `api/public/references/[slug]`:
  - souhrn: průměr hvězd, počet hodnocení, počet přednášek, % „doporučil/a by“,
  - u každé přednášky: název, datum, organizátor, průměr, počet, % doporučení, % „odnesl/a si něco“, viditelné komentáře s odpovědí, `materialsUrl`.
  - **Bez kontaktů a bez hashů.**

**Pravidla nezávislosti** (jádro funkce, pokrýt testy)
- **Do průměru a procent se vždy počítají všechna hodnocení** kromě úrovně **Zadržená/Stažená** podle mechanismů z `reference-duvera`. Lektor **nemůže hodnocení smazat ani upravit**. Může jen skrýt text komentáře (`commentHidden`), hvězdy v průměru zůstávají.
- Přednáška se na vizitce zobrazí až od **5 platných hodnocení**. Do té doby ji vidí jen lektor v HUBu.
- Signály podezřelého chování, které zvedají riziko podle `reference-duvera`:
  - počet hodnocení > 1,5 × `expectedAudience`, pokud je vyplněné,
  - víc než 10 hodnocení za 2 minuty,
  - opakovaný `ipHash`,
  - hodnocení mimo den přednášky (dny 2–3 platí, ale s nižší váhou signálu).
- Skrytí celé přednášky (`hidden`) lektorem je v pořádku, ale do souhrnu na vizitce pak nejde **ani jedna** její část. Lektor tedy nemůže skrýt jen slabou přednášku a nechat si její počty v souhrnu. Každá akce jde do auditu.
- Lektor **nesmí měnit** `title` ani `date`, jakmile má přednáška první hodnocení. Opravit jde jen překlep v `organizer`/`place`, a to s auditem.

## 3. spx-hub: UI lektora (jen klienti se zapnutým `lectures`)
- Nová položka navigace **„Přednášky“** (ikona `Presentation`).
- **Seznam přednášek:** název, datum, stav (Připravená / Sbírá hodnocení do {datum} / Uzavřená / Skrytá), průměr, počet, % doporučení.
- **„Nová přednáška“:** formulář. Po uložení:
  - **QR ke stažení** (PNG 2048 px a SVG, tmavý na bílém, s okrajem),
  - odkaz ke zkopírování,
  - **náhled slajdu**: PNG 1920×1080 s QR, textem „Jak se vám líbilo? Ohodnoťte přednášku“ a jménem lektora. Lektor ho vloží jako poslední slajd.
- **Detail přednášky:**
  - grafy rozložení hvězd a odpovědí,
  - komentáře s akcemi „Skrýt text“ a „Odpovědět“ (jedna odpověď, stejné chování jako u referencí),
  - **Kontakty posluchačů**: jméno, kontakt, datum souhlasu, export CSV, tlačítko „Smazat kontakt“ (GDPR; hodnocení zůstane, smaže se jen kontakt).
- Prázdný stav: krátký návod ve 3 krocích (založ → dej QR na poslední slajd → řekni na konci „Budu rád za 30 vteřin“).
- Průvodce (`lib/guide.ts`): nová sekce „Hodnocení přednášek“ s tipy:
  - QR ukazovat **na konci** a nechat ho svítit,
  - říct nahlas, že hodnocení je anonymní a trvá 30 vteřin,
  - materiály nabídnout všem, ne jako odměnu za hodnocení.

## 4. spx-dbc: vizitka
- Nová záložka **„Přednášky“** (`type: "custom"`, `component: "LecturesSection"`). Na vizitce se objeví, jen když má klient zapnuté `lectures` a API vrátí aspoň jednu zveřejněnou přednášku, **nebo** když návštěvník přišel přes `/h/[token]`. Data se načítají stejně jako `lib/hubReferences.ts` (`HUB_URL`, revalidace).
- **Režim hodnocení** (příchod z `/h/[token]`, okno otevřené). Záložka se otevře rovnou a nahoře je karta:
  - nadpis „Jak se vám líbila přednáška?“, pod ním název přednášky, datum a organizátor,
  - 5 velkých hvězd (dotyk, klávesnice, ARIA),
  - „Odnesl/a jsem si něco, co použiju“: Ano / Částečně / Ne (segmentový přepínač),
  - „Doporučil/a byste přednášku dalším?“: Ano / Ne,
  - „Chcete něco dodat?“ (nepovinné),
  - „Vaše jméno“ (nepovinné) s nápovědou „Bez jména se zobrazí jako Anonymní posluchač“,
  - zaškrtávátko **„Chci zůstat v kontaktu s {jméno lektora}“**; po zaškrtnutí se zobrazí pole e-mail/telefon a povinný souhlas: „Souhlasím, aby mě {jméno lektora} kontaktoval/a. Údaje zpracováváme podle [Zásad ochrany osobních údajů].“,
  - tlačítko **„Odeslat hodnocení“**,
  - honeypot.
  - Celé musí jít vyplnit **do 30 vteřin jedním palcem** na 375 px.
- **Po odeslání:**
  - „Děkujeme! Hodnocení je anonymní a lektor ho nemůže měnit.“
  - tlačítka **Uložit kontakt** (vCard) a **Materiály k přednášce**, pokud existují.
  - **Materiály jsou dostupné i bez hodnocení** (odkaz pod formulářem). Nesmí být odměnou za hodnocení.
- **Veřejný přehled:**
  - souhrnný pruh „★ 4,8 · 132 hodnocení · 6 přednášek · 94 % by doporučilo“,
  - karty přednášek od nejnovější: název, datum, organizátor, průměr a počet, dva malé ukazatele (% doporučení, % „odnesl/a si něco“), max. 3 komentáře s „Zobrazit další“, odpověď lektora pod komentářem (styl z doplňku `reference-duvera`).
- **Štítek důvěry** u souhrnu: „Hodnocení sbíraná přímo od posluchačů. Lektor je nemůže měnit ani mazat.“ s odkazem **„Jak to funguje“**. Modál vysvětlí:
  - hodnocení se sbírají jen přes odkaz z přednášky a jen 3 dny po ní,
  - z jednoho zařízení jde hodnotit jednou,
  - do průměru se počítá vše,
  - podezřelá hodnocení systém zadrží.
  
  Tím je splněna informační povinnost k recenzím (novela zákona o ochraně spotřebitele 2023).
- Design: stávající styl vizitek a komponenty karet referencí. Světlý i tmavý režim. Žádné nové barvy mimo accent klienta.
- Měření (jen po souhlasu s cookies, `lib/analytics.ts`): `lecture_rate_view`, `lecture_rate_submit` (parametr `stars`), `lecture_contact_optin`, `lecture_materials_click`, `lectures_tab_view`.

## 5. Ochrana osobních údajů
- Kontakty posluchačů zpracovává **lektor jako správce**, SoloPixel jako zpracovatel (stejně jako u referencí). Do Zásad ochrany osobních údajů vizitek doplnit odstavec „Hodnocení přednášek“: co se sbírá, proč, jak dlouho a jak požádat o smazání.
- **Text zásad Lukáš ještě zkontroluje, není to právní rada.** Agent připraví návrh do `spec/` a do progress napíše, kde je.
- Hashe IP a zařízení se mažou 90 dní po uzavření přednášky.

## 6. Mimo rozsah (nedělat)
- Žádné odměny ani soutěže za hodnocení.
- Žádné hromadné e-maily posluchačům ze SoloPixelu.
- Žádné propojení s Google recenzemi.
- Nevázat na tarif, nastavit jen přepínač.

## Hotovo, když
- [ ] CRM: přepínač „Hodnocení přednášek“ a pravidla Firestore.
- [ ] HUB: založení přednášky, QR (PNG + SVG), slajd 1920×1080, seznam, detail s grafy, skrytí textu komentáře, odpověď, kontakty s exportem a mazáním, průvodce.
- [ ] `/h/[token]` vede na vizitku do režimu hodnocení; okno 3 dny; po zavření hláška.
- [ ] Vizitka: formulář do 30 s na 375 px, poděkování, materiály i bez hodnocení, veřejný souhrn od 5 hodnocení, štítek a „Jak to funguje“.
- [ ] Testy pravidel nezávislosti:
  - smazat ani upravit hodnocení nejde,
  - skrytý komentář se dál počítá do průměru,
  - skrytá přednáška vypadne ze souhrnu celá,
  - jedno hodnocení na zařízení,
  - zavřené okno vrací 410,
  - signály podezřelosti,
  - práh 5 hodnocení,
  - veřejné API nevrací kontakty ani hashe.
- [ ] `tsc`, `lint`, `build` zelené ve všech třech repech. Screenshoty 375 px a 1440 px (HUB i vizitka, světlý i tmavý režim).
- [ ] progress, work-log, CHANGELOG; push větví → preview. **Zastav před PR do `main`.** Do progress napiš:
  - pořadí nasazení (core → hub → dbc),
  - env proměnné,
  - návrh textu zásad,
  - jak to Lukáš vyzkouší na své vizitce (`kaleta-lukas`).
