# Fáze 12 — Dashboard jako pracovní nástroj

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 11 (používá PageHeader, lib/status.ts, lib/format.ts).

## Záměr

Dashboard má odpovídat na dvě otázky: „co mám dnes udělat?" a „jak se firmě daří?". Žádná analytics hřiště — akční feed + pár čísel. Vše s prokliky do modulů.

## Zadání

### 1. Feed „Vyžaduje akci" (hlavní blok)

- `lib/attention.ts` — server-side agregace položek vyžadujících pozornost, každá `{ type, severity, title, age, href }`:
  - faktura po splatnosti (severity dle dnů: >14 vysoká),
  - urgentní/high ticket bez řešitele nebo bez změny 7+ dní,
  - **stagnující lead** — beze změny `updatedAt` 14+ dní v aktivní fázi (contacted–contract),
  - nezpracované podklady starší 3 dnů,
  - onboarding úkol po termínu.
- Render: jeden seznam seřazený dle severity + stáří, ikona dle typu (lucide), barva dle `lib/status.ts`, proklik na entitu. Prázdný stav: „Vše vyřízeno ✓".
- Pro roli sales: jen jeho položky (vlastní leady, jeho úkoly, podklady), bez faktur.

### 2. Finanční řádek (jen admin/member)

- Metriky v jednom řádku: **MRR** (suma aktivních předplatných, roční /12), **zaplaceno tento měsíc**, **vyfakturováno tento měsíc**, **hodnota otevřené pipeline** (suma `value` leadů v aktivních fázích).
- Mini sloupcový graf zaplacených faktur po měsících za 12 měsíců (recharts, jednoduchý, bez legend a mřížek; výška ~80 px).
- Formátování přes `lib/format.ts`.

### 3. Onboarding přehled

- Klienti se stavem `onboarding`: jméno, dní v onboardingu, progres úkolů (hotovo/celkem z tasks s `clientId` + `checklistTemplateId`), proklik na detail. Zvýraznit zaseknuté (žádný dokončený úkol 7+ dní).

### 4. Aktivita týmu

- Posledních 10 záznamů `activity` napříč entitami: kdo (jméno z users), co (text), kde (odkaz na entitu), kdy (relativně, např. „před 2 h").
- Pro sales skrýt aktivitu týkající se faktur/předplatných.

### 5. Layout

- Pořadí: finanční řádek (admin/member) → Vyžaduje akci (široký sloupec) + Aktivita týmu (úzký sloupec) → Onboarding přehled.
- Stávající karty (pipeline, moje úkoly, podklady) zachovat/sloučit tam, kde nedublují feed — duplicitní počítadla odstranit.
- Responzivní: na mobilu jeden sloupec, feed první.

### 6. Výkon

- Agregace v jednom Server Component fetchi (Promise.all nad admin SDK dotazy), žádné klientské vodopády. Pokud by dotazů bylo moc, zvaž jednoduché cache (revalidate 60 s) — realtime tu není potřeba.

## Akceptační kritéria

- Feed ukazuje reálné položky všech pěti typů (otestovat vytvořením testovacích dat) a prokliky vedou na správné entity.
- MRR odpovídá ručnímu součtu předplatných; graf ukazuje zaplacené faktury po měsících.
- Sales vidí jen svůj ořezaný dashboard bez financí (ověřit network tab).
- Lint + build čisté, ověření v prohlížeči za všechny role, work-log, stav fáze, commit (`feat: [changelog] akční dashboard`).
