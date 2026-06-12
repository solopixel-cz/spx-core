# Fáze 13 — Prospekti (zásobník oslovení)

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 12. Datový model kolekce `prospects` je už ve `spec/context/data-model.md` — drž se ho.

## Záměr

Tým oslovuje ~1000 poradců z externího portálu, ve více lidech. Potřebujeme vrstvu PŘED leady: databázi prospektů s logem „kdo koho kdy kontaktoval a s jakým výsledkem", aby se nikdy nestalo, že dva obchodníci osloví téhož člověka. Z prospekta se lead stává až při projevené reakci.

## Zadání

### 1. Stránka `/prospekti`

- Sidebar: sekce Obchod, mezi Leady a Klienti, ikona address-book. Viditelné pro všechny role.
- Záložky/filtr: **Volní** (bez ownerUid), **Moji**, **Všichni**. Další filtry: stav, město, vlastník.
- Tabulka (TanStack): jméno, firma, město, stav (badge dle `lib/status.ts`), vlastník (avatar), poslední kontakt, follow-up. Řazení dle posledního kontaktu. U 1000+ řádků dej pozor na výkon — server-side stránkování po ~50 (cursor `startAfter`), filtry přes query.
- Řádková akce **„Zabrat"** u volných — transakce: nastaví `ownerUid` + `claimedAt` jen pokud je pole prázdné; při souběhu druhý dostane toast „Už zabráno kolegou".

### 2. Detail prospekta (Sheet)

- Pole + historie kontaktů (z `activity`, entityType=prospect): kdo, kdy, kanál, text.
- Akce **„Zapsat kontakt"**: kanál (telefon/e-mail/LinkedIn/osobně), výsledek (nedovoláno / nechal vzkaz / proběhl rozhovor / poslán e-mail), poznámka, volitelné follow-up datum. Zápis: activity záznam + `lastTouchAt` + `status='contacted'` (pokud byl `new`) + `nextFollowUpAt`.
- Akce **„Převést na lead"** (jen vlastník nebo admin/member): transakce vytvoří `lead` (source=`outreach`, ownerUid z prospekta, poznámka s odkazem na historii), nastaví `status='converted'` + `leadId`, redirect na lead. Akce **„Nemá zájem"** / **„Nedostupný"** s poznámkou.
- Uvolnění: vlastník (nebo admin) může prospekta vrátit do volných (`ownerUid` → null), např. když odjíždí na dovolenou.

### 3. Import a přidávání

- **CSV import** (admin/member): dialog s uploadem, mapování sloupců (jméno, firma, e-mail, telefon, město, URL profilu), náhled prvních 10 řádků, **deduplikace** — match podle e-mailu, bez e-mailu podle jméno+firma; duplicity přeskočit a vypsat počet. Každý import dostane `importBatchId` (možnost dávku zobrazit/vrátit). Import přes route handler s admin SDK, po dávkách (batched writes po 500).
- **Ruční přidání**: dialog pro jednoho prospekta, stejná deduplikace s upozorněním.

### 4. Integrace

- **Attention feed** (`lib/attention.ts`): nová položka — „follow-up u prospekta dnes/po termínu" (jen vlastníkovy pro sales, všechny pro admin/member).
- **Dashboard**: do statistik přidat řádek oslovování — osloveno tento týden / reaguje / konvertováno, pro adminy rozpad podle obchodníka (tabulka: obchodník, zabráno, osloveno, reakce, konverze).
- Cmd+K vyhledávání: přidat prospekty.

### 5. Rules + indexy

- `prospects`: read pro přihlášené; create/update přes route handlers (admin SDK); klientsky povol jen transakci zabrání (`ownerUid` z null + `claimedAt`), pokud je zabírání implementované klientsky — jinak vše přes API.
- Indexy dle dotazů, minimálně: `prospects(ownerUid, nextFollowUpAt)`, `prospects(status, lastTouchAt)`.
- Po změně: `firebase deploy --only firestore` a **ověřit `Deploying to 'markly-1bd84'`**.

## Akceptační kritéria

- Dva uživatelé nemohou zabrat téhož prospekta (otestovat ve dvou oknech).
- CSV se 100+ řádky se naimportuje s deduplikací, druhý import téhož souboru přidá 0 záznamů.
- Zapsání kontaktu se objeví v historii se jménem obchodníka; follow-up se ukáže ve feedu.
- Konverze vytvoří lead s vlastníkem a zpětným odkazem; prospekt zmizí z aktivních pohledů.
- Tabulka je svižná i s 1000 záznamy (stránkování, žádné načítání celé kolekce).
- Lint + build čisté, ověření v prohlížeči (i jako sales), work-log, stav fáze, commit (`feat: [changelog] prospekti — zásobník oslovení s logem kontaktů`).
