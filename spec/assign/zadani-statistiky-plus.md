# Zadání: Rozšířené statistiky (doplněk „Statistiky+“) – core, vizitky, HUB

Zadal: hlavní vlákno (CMO + CTO + CFO), schválil Lukáš 15. 10. 2026 · Tabule **#22** · Repa: **spx-core**, **spx-dbc**, **spx-hub** (každé repo dělá svou část, stejný dokument je ve všech třech `spec/assign/zadani-statistiky-plus.md`) · Režim: **bez dozoru**, zastávka před mergem do `main` v každém repu

## Proč

Základní statistiky v HUBu (návštěvy, návštěvníci, kontaktovali vás, poptávky, odkud lidé přišli, města, graf po dnech a měsících) fungují a zůstávají, jak jsou. Lukáš chce pro „fajnšmekry“ **podrobnější statistiky jako placený doplněk**:
- tým ho zapne klientovi v CRM (spx-core),
- HUB pak ukáže rozšířenou část,
- bez zapnutí klient vidí jen základ.

Cena doplňku se teprve určí (CFO). Kód řeší jen zapnutí a vypnutí.

## ⚠️ Předpoklad: souhlas s cookies na vizitkách (CTO, ČERVENÁ)

V `spx-dbc` `main` se Google Analytics načítá **bez souhlasu návštěvníka**: `app/layout.tsx` vkládá `<GoogleAnalytics gaId=…>` vždy, když má profil `googleAnalyticsId`, a cookie lišta na vizitkách není. Web solopixel.cz to má od vlny 3 opravené, vizitky ne. Je to porušený mantinel M5. Rozšířené měření by riziko jen zvětšilo.

- **Rozšířené statistiky se nesmí nasadit, dokud vizitky nemají souhlas s cookies** (krok D0 níže). Rozhoduje Lukáš.
- Rozpracovaná lišta souhlasu je ve větvi `feature/ga-analytics` (GA fáze A–C, `claude/lysek-michal-otevrene-body.md`). Navázat na ni, nepsat znovu.
- Důsledek: čísla budou jen od lidí, kteří souhlasí. To je správně. V HUBu to vysvětlit jednou větou v „Jak statistiky číst“.

---

## Co z vizitky umíme zachytit (inventura CMO + CTO, 15. 10.)

### A. Už se měří (GA4 automaticky nebo naše události v `spx-dbc/lib/analytics.ts`)
| Oblast | Data |
|---|---|
| Návštěvy | relace, uživatelé, noví vs. vracející se, doba zapojení, míra zapojení |
| Zařízení | typ (mobil, počítač, tablet), operační systém, prohlížeč, jazyk |
| Místo | země, kraj, město |
| Zdroj | skupina kanálů, zdroj / médium, kampaň (UTM), odkazující web, vstupní stránka |
| Čas | datum, den v týdnu, hodina |
| Naše události | `tab_switch` (`tab_id`), `contact_click` (`method`: phone / email / whatsapp), `social_click` (`platform`), `chat_open`, `chat_message`, `form_submit` (`form_type`), `service_request` (`service`), `calculator_select` (`calculator`), `calculator_result`, `cta_click` (`label`), `pricing_tier_switch` (`tier`), `pwa_install`, `newsletter_signup` |
| GA4 rozšířené měření | posun stránky (scroll 90 %), odchozí odkazy (`link_url`), stažení souborů (e-book) |

### B. Neměří se, ale chceme (doplnit ve spx-dbc)
| Událost | Kdy | Parametr |
|---|---|---|
| `contact_save` | klik na „Uložit kontakt“ (stažení vCard) | `placement` (hero / akce) |
| `share` | sdílení vizitky | `method`: `native` (systémové sdílení), `copy` (zkopírování odkazu), `qr` |
| `qr_open` | otevření QR okna | – |
| `address_click` | klik na adresu / mapu | – |
| `reference_expand`, `reference_cta` | z vizitky-01 krok 5 | – |

### C. QR odlišit od přímého odkazu
QR v okně vizitky (`QRModal`) i QR na tištěných vizitkách a materiálech dostanou UTM, aby šlo QR odlišit od přímého odkazu:
- okno vizitky: `?utm_source=qr&utm_medium=vizitka`,
- tisk: `?utm_source=qr&utm_medium=tisk`.

Dnes padá obojí do „Přímo“. Odkaz bez UTM funguje dál.

### Co nesbíráme (pravidla)
- Nic o konkrétním člověku: žádné IP, žádné sledování jednotlivce, žádné spojování s CRM. **Jen souhrnná čísla.**
- Neměřit obsah chatu ani formulářů.
- GA4 u malých čísel data skrývá (prahování). V HUBu ukázat „méně než 10“ místo nuly nebo chyby.

---

## Rozšířené statistiky v HUBu (co uvidí klient s doplňkem)

Nad základem nová část **„Podrobně“**. Stejné období a srovnání s předchozím obdobím jako v základu. Texty jednoduše, bez odborných slov (CMO):

1. **Kdy vás lidé hledají:** mřížka den v týdnu × hodina (teplotní mapa). Věta nad ní: „Nejvíc lidí si vás otevírá v úterý mezi 18 a 20 h.“ (spočítat).
2. **Na čem si vás prohlížejí:** mobil / počítač / tablet a iPhone / Android.
3. **Noví a vracející se:** kolik lidí přišlo poprvé a kolik se vrátilo. Průměrná doba na vizitce.
4. **Co je zajímá:** záložky podle počtu otevření (`tab_switch`), nejžádanější služby (`service_request`), kalkulačky (otevřené / dopočítané), rozbalené reference.
5. **Co udělali:**
   - uložili kontakt (`contact_save`),
   - sdíleli vizitku (a jak),
   - otevřeli QR,
   - klikli na sociální sítě (podle sítě),
   - otevřeli chat s Pixelou a poslali zprávu,
   - nainstalovali vizitku do telefonu,
   - přihlásili se k novinkám.
6. **Odkud přesně:**
   - zdroj a kampaň: např. „QR z tištěné vizitky“, „e-mailový podpis“, „Instagram bio“,
   - QR vs. odkaz,
   - odkazující weby (top 10).
7. **Místa podrobně:** kraje a top 20 měst, země.
8. **Cesta návštěvníka:** návštěva → zájem (otevřel záložku nebo dočetl) → akce (kontakt, uložení, poptávka). Na každém kroku počet a procento. Věta: „Z 10 lidí, kteří si vás otevřou, vás 2 kontaktují.“
9. **Export:** stažení CSV za zvolené období (souhrnná čísla, nic osobního).

Bez doplňku se místo části „Podrobně“ ukáže jedna zamčená karta s ukázkou (rozmazaný náhled): „Rozšířené statistiky: kdy vás lidé hledají, co je zajímá a co udělali. Zapneme vám je na požádání.“ + tlačítko „Mám zájem“, které pošle týmu zprávu přes stávající Pomoc v HUBu.

---

## Úkoly po repech (pořadí: core → dbc → hub; hub může stavět souběžně na demo datech)

### spx-core
- [ ] `lib/hub-features.ts`: nová funkce `statsPlus: "Rozšířené statistiky"`, `hubFeaturesFrom` ji čte (chybí = vypnuto). Přepínač v detailu klienta (`app/api/clients/[id]/hub-features`) a v UI CRM vedle „Statistiky“ a „Reference“.
- [ ] `statsPlus` jde zapnout jen když je zapnuté `stats` (jinak upozornění).
- [ ] Žádná změna pravidel databáze (pole je v `clients`, čte server).

### spx-dbc
- [ ] **D0 (předpoklad):** souhlas s cookies na všech vizitkách podle `feature/ga-analytics` (GA4 Consent Mode v2, výchozí `denied`, GA se načte až po souhlasu, lišta světlá/tmavá, mobil). Bez D0 nejde rozšířené měření do produkce.
- [ ] Události z části B přes `lib/analytics.ts` (stávající názvy **neměnit**).
- [ ] UTM do QR (část C) v `QRModal` a v generátoru tiskových QR (`scripts/generate_vizitka.py` a podobně).
- [ ] Skript na registraci vlastních dimenzí GA4 ve všech property vizitek (Admin API): `tab_id`, `method`, `platform`, `form_type`, `service`, `calculator`, `label`, `placement`. Spouští Lukáš s přístupem do GA; dokumentace v README.

### spx-hub
- [ ] `lib/hub-features.ts` (kopie z core): `statsPlus`.
- [ ] `lib/stats.ts`: nové dotazy GA4 (Data API, `batchRunReports`), jen pro klienty se `statsPlus`. Dimenze `dayOfWeek` + `hour`, `deviceCategory`, `operatingSystem`, `newVsReturning`, `region`, `country`, `sessionSource`, `sessionMedium`, `sessionCampaignName`, `pageReferrer`. Události podle části A a B; vlastní dimenze přes `customEvent:*`. **Chybějící vlastní dimenze = sekce se skryje** (jako dnes u `customEvent:method`), nic nespadne.
- [ ] Cache jako u základu. Počet dotazů hlídat (kvóty GA4 Data API na property): rozšířená data načítat až při otevření části „Podrobně“.
- [ ] UI podle části „Rozšířené statistiky v HUBu“: komponenty a vzhled jako `stats-view.tsx` / `stats-parts.tsx`, mobil první. Prahování „méně než 10“.
- [ ] Zamčená karta pro klienty bez doplňku + „Mám zájem“ (přes stávající Pomoc).
- [ ] Demo účet: ukázková rozšířená data (ať jde funkci předvádět na schůzkách).
- [ ] „Jak statistiky číst“: věta o souhlasu s cookies.

## Mantinely
- Základní statistiky beze změny pro všechny.
- Žádné osobní údaje návštěvníků, jen souhrny z GA4.
- Bez souhlasu (D0) nic nového do produkce vizitek.
- Necommitovat cizí rozpracované změny; v spx-dbc běží souběžně `feat/vizitky-jednotny-layout` (#21) a `fix/cena-start-349`. Pracovní větev **`feat/statistiky-plus`** v každém repu z `main`; v spx-dbc koordinovat s #21 (události přidat do `lib/analytics.ts`, který #21 nemění).
- Zastávka před PR do `main` v každém repu; Lukáš ověří na demo účtu a na své vizitce.

## Hotovo, když
- [ ] V CRM jde klientovi zapnout „Rozšířené statistiky“; HUB je bez něj nezobrazí (jen zamčenou kartu).
- [ ] Vizitky mají souhlas s cookies a nové události (B) a UTM u QR (C); stávající události beze změny.
- [ ] HUB s doplňkem ukazuje sekce 1–9; bez dat nebo dimenzí se sekce slušně skryjí; demo účet má ukázková data.
- [ ] Testy (hub má 100+ testů: přidat na `statsPlus`, prahování, skrývání sekcí), build zelený ve všech třech repech.
- [ ] work-log, CHANGELOG; krátké shrnutí pro hlavní vlákno: co je hotové, co musí Lukáš spustit (skript dimenzí GA4).

## Mimo rozsah
- Cena a fakturace doplňku (CFO + 13c).
- Sledování jednotlivých návštěvníků, napojení na CRM leady.
- Statistiky pro web solopixel.cz.
