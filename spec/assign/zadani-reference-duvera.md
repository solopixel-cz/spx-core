# Zadání: Důvěra referencí – automatický systém ověřování

Zadal: hlavní vlákno (CTO + CEO + CMO), schválil Lukáš 16. 10. 2026 · Tabule **#23** · Repa: **spx-hub** (hlavní část), **spx-dbc** (zobrazení na vizitce) · Režim: **bez dozoru**, zastávka před PR do `main`

## Proč

Reference prodávají, jen když jim lidé věří. Nikdo neumí stoprocentně dokázat, že si poradce referenci nenapsal sám. Umíme ale postavit systém, který:
- podvod **zdraží a zviditelní**,
- **automaticky** rozhodne, co se smí zveřejnit,
- návštěvníkovi **poctivě ukáže**, jak je reference ověřená.

**Lukášův požadavek:** žádné ruční schvalování týmem. Jen mechanismy, co nejvíc automaticky.

Zákonný rámec (CEO, ověřit s právníkem): novela zákona o ochraně spotřebitele (2023) říká, že kdo zveřejňuje recenze, musí uvést, **jestli a jak ověřuje**, že jsou od skutečných zákazníků. Falešné recenze jsou nekalá obchodní praktika. Systém níže to pokrývá a stránka „Jak ověřujeme reference“ to vysvětluje.

Navazuje na hotové reference (Karel) a na limit proti spamu (`lib/reference-limits.ts`). Otisky IP se dělají stejně: HMAC, žádná surová IP.

---

## 1. Signály (sbírá server při odeslání a potom)

| Signál | Jak | Váha |
|---|---|---|
| **Osobní pozvánka** | reference přišla přes `/p/[token]` (e-mail prokazatelně doručen) | silně + |
| **Potvrzený e-mail** | u pevného odkazu / QR volitelné pole e-mail → potvrzovací odkaz (dvojí potvrzení); e-mail se nikde nezveřejní | silně + |
| **E-mail je poradcův** | shoda s e-mailem účtu v HUBu, kontaktním e-mailem vizitky nebo doménou vizitky / poradce | **červená** |
| **Jednorázová e-mailová služba** | statický seznam domén v repu (pravidelně aktualizovatelný) | **červená** pro ověření |
| **Doména bez pošty** | DNS MX záznam domény neexistuje | **červená** pro ověření |
| **Duplicitní autor** | stejný e-mail už napsal referenci na tutéž vizitku | **červená** |
| **Stejné zařízení / síť jako poradce** | otisk (HMAC IP + rodina prohlížeče a systému) se shoduje s otisky poradcových přihlášení do HUBu za posledních 90 dní | **červená** |
| **Příliš rychle** | odesláno do 60 s od vytvoření pozvánky ze stejného otisku, nebo formulář vyplněný za méně než ~15 s (čas načtení podepsaný serverem) | oranžová |
| **Nával** | víc než 5 referencí na vizitku za 24 h, nebo víc než 3 v prvních 48 h po zapnutí funkce | oranžová |
| **Podobný text** | podobnost s jinou referencí téže vizitky nebo jakékoli jiné vizitky ≥ 0,8 (shingles / Jaccard nad normalizovaným textem) | **červená** |
| **Zpětné potvrzení „Ano“** | autor potvrdil, že referenci psal (bod 4) | silně + |
| **Zpětné potvrzení „Ne“** | autor popřel autorství | **stažení** |
| **E-mail se vrátil** | bounce z Resend (webhook) | ztráta ověření |

Žádné „AI detektory“ textu. Jsou nespolehlivé a nespravedlivé.

## 2. Úrovně (rozhoduje automat, ne člověk)

| Úroveň | Podmínka | Co se děje |
|---|---|---|
| **Ověřená** | (osobní pozvánka **nebo** potvrzený e-mail) a žádná červená | poradce ji smí zveřejnit, na vizitce štítek **„Ověřeno“** |
| **Neověřená** | bez ověřeného e-mailu, žádná červená, nanejvýš oranžová | poradce ji smí zveřejnit, **bez štítku** |
| **Zadržená** | jakákoli červená (kromě „Ne“) | **nejde zveřejnit**; poradce vidí neutrální „Tuto referenci se nepodařilo automaticky ověřit“ a tlačítko **„Požádat autora o ověření“** (pošle autorovi potvrzovací e-mail, viz níže) |
| **Stažená** | autor řekl „Ne“ | automaticky skrytá, poradce dostane e-mail s vysvětlením |

- **Cesta ze Zadržené ven je jen automatická:** autor potvrdí e-mail **z jiného zařízení / sítě než poradce** a mezitím nepřibude další červená → Ověřená. Jinak zůstává zadržená. Žádné ruční výjimky.
- Úroveň se přepočítá při každé nové události (potvrzení, bounce, zpětné potvrzení, nová podobná reference).
- Poradci se **nevysvětluje přesně, který signál** referenci zadržel (aby se kontrola nedala obejít). Interně se důvod ukládá do auditu.

## 3. Pravidla, která nejdou obejít
- **Text reference nejde upravit** nikým (ani poradcem, ani týmem). Při uložení uložit otisk obsahu (SHA-256). Poradce smí jen zveřejnit / skrýt / smazat.
- **Datum vzniku a zveřejnění** se ukládá a zobrazuje.
- Úroveň a historie změn v `hubAuditLog`.

## 4. Zpětné potvrzení autorovi (automatické)
- **3 dny po zveřejnění** každé reference, u které známe e-mail (pozvánka nebo potvrzený e-mail), odejde z domény SoloPixel krátký e-mail:
  - text: „Děkujeme za referenci pro {poradce}. Psal(a) jste ji vy?“,
  - tlačítka **[Ano, je moje]** a **[Ne, nepsal(a) jsem ji]**,
  - podpisový odkaz s jednorázovým tokenem.
- „Ano“ → signál +, stav se nemění nebo se zlepší. „Ne“ → **Stažená**. Žádná odpověď → beze změny (nikoho netrestáme za nečinnost).
- Jen jeden e-mail na referenci, žádné připomínky. Patička: proč e-mail dostává a že je jednorázový. Text e-mailu v souladu se zákonem 480/2004 Sb. (je to služební e-mail k jeho vlastní referenci, ne reklama).

## 5. Důvěra poradce (automatická opatření)
- Pro každou vizitku počítat podíl referencí **Zadržených a Stažených** za 90 dní.
- Když přesáhne **30 %** (a jsou aspoň 3 takové): pevný odkaz / QR na reference se na **30 dní vypne**, zůstanou jen osobní e-mailové pozvánky. Poradce dostane srozumitelné vysvětlení.
- **2 stažené reference („Ne“) za 90 dní** → zveřejňování referencí se na 30 dní pozastaví. Tým dostane **jen informační e-mail** (žádné schvalování).
- Po 30 dnech se vše samo obnoví.

## 6. Co uvidí návštěvník vizitky (spx-dbc, navazuje na vizitky-01 krok 5)
- Veřejné API referencí (`app/api/public/references/[slug]`) vrací navíc `verified: boolean`. **Nevracet** úroveň, signály ani e-maily.
- Na kartě reference štítek **„Ověřeno“** (decentní, ikona štítu nebo fajfky) s nápovědou „Autor potvrdil svůj e-mail“.
- V souhrnu: „12 referencí · 9 ověřených“.
- Odkaz **„Jak ověřujeme reference“** (malý, pod referencemi) otevře krátký text:
  > Reference píšou zákazníci sami přes osobní odkaz nebo formulář. Text nikdo nemůže upravit. Štítek „Ověřeno“ znamená, že autor potvrdil svůj e-mail. Každou referenci automaticky kontrolujeme a autorům posíláme dotaz, zda ji opravdu napsali. Poradce rozhoduje jen o tom, zda referenci zveřejní.

## 7. Co uvidí poradce v HUBu
- U každé reference stav: **Ověřená / Neověřená / Nepodařilo se ověřit / Stažená** + datum.
- U Neověřené tip: „Pošlete zákazníkovi osobní pozvánku e-mailem, reference pak bude mít štítek Ověřeno.“
- Krátké vysvětlení „Proč ověřujeme“ (důvěra návštěvníků, zákon).
- Formulář reference (pevný odkaz/QR): pole **e-mail (nepovinné)** s větou „Potvrďte e-mail a vaše reference získá štítek Ověřeno. Nikde ho nezveřejníme.“

## 8. Ochrana osobních údajů
- Ukládá se: e-mail autora (dokud je reference uložená, max. 12 měsíců po smazání reference kvůli auditu), otisky zařízení/sítě (90 dní, jen HMAC), čas vyplnění.
- Aktualizovat text souhlasu ve formuláři (`privacyNotice`) o ověřování a zpětný e-mail. Text dá Lukáš zkontrolovat (není to právní rada).
- Otisky poradcových přihlášení: zapisovat při přihlášení/obnově relace do samostatné kolekce, rules `if false`, mazat po 90 dnech.

## Technicky (CTO)
- Vše na serveru HUBu (Admin SDK); Firestore rules pro nové kolekce `if false` (pravidla jsou v spx-core, **nová kolekce = změna `firestore.rules` v spx-core**, malý PR tam).
- Podobnost textů: normalizace (malá písmena, bez diakritiky a interpunkce), 5-znakové shingles, Jaccard. Porovnávat s posledními 500 referencemi celkem (index otisků v samostatné kolekci), ať to zůstane rychlé.
- MX lookup přes `node:dns/promises` s timeoutem 2 s. Při chybě DNS signál nepoužít.
- Resend webhook na bounce (ověřený podpis).
- Plánovač pro zpětné potvrzení a pro obnovu po 30 dnech: Vercel Cron.
- Demo účet: celý systém funguje s ukázkovými daty, **žádné e-maily ven**.
- Testy: každý signál, každá úroveň, přechody (Zadržená → Ověřená), opatření z bodu 5, API `verified`, že text nejde upravit.

## Mantinely
- Žádné ruční schvalování, žádná fronta pro tým.
- Nezveřejňovat nic o signálech veřejně ani poradci v detailu.
- Žádné surové IP, žádné AI detektory.
- Pracovní větve **`feat/reference-duvera`** (spx-hub, spx-dbc, malá v spx-core na rules) z `main`; v spx-dbc koordinovat s `feat/vizitky-jednotny-layout` (štítek do nové karty reference).
- Zastávka před PR do `main`, Lukáš ověří na demo účtu a na své vizitce.

## Hotovo, když
- [ ] Signály 1–12 se vyhodnocují, úrovně se přepočítávají automaticky, vše v auditu.
- [ ] Zadržená reference nejde zveřejnit; „Požádat autora o ověření“ ji může automaticky převést na Ověřenou.
- [ ] Zpětné potvrzení odchází 3 dny po zveřejnění; „Ne“ referenci stáhne; bounce ruší ověření.
- [ ] Opatření pro poradce (bod 5) se zapnou a po 30 dnech samy vypnou.
- [ ] Vizitka: štítek „Ověřeno“, souhrn ověřených, „Jak ověřujeme reference“.
- [ ] HUB: stavy u referencí, tip na osobní pozvánku, volitelný e-mail ve formuláři.
- [ ] Text nejde upravit (test), rules pro nové kolekce v spx-core.
- [ ] Testy, build zelený ve všech repech, work-log, CHANGELOG, shrnutí pro hlavní vlákno.
