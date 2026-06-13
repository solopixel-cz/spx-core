# Fáze 20 — Mazání a archivace

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Datový model (`deletedAt`, `deletedBy` na archivovatelných entitách) je už ve `spec/context/data-model.md`.

## Záměr

Umožnit úklid chybných a nepotřebných záznamů, aniž by vznikl nepořádek — osiřelé odkazy, prázdná jména, rozbité součty. Tři úrovně podle citlivosti:

1. **Faktury — nikdy nemazat, jen storno.** Účetní doklad + číselná řada + provize. Storno (`cancelled`) už existuje (fáze 5/16). Tato fáze na fakturách NEMĚNÍ nic kromě potvrzení, že „smazat" tam není.
2. **Měkké smazání (archivace)** — výchozí pro `clients`, `instances`, `leads`, `tickets`. Nastaví `deletedAt`+`deletedBy`, záznam zmizí z provozu, ale zůstane v DB. Vratné.
3. **Trvalé smazání** — jen pro záznamy BEZ navázaných dat, jen admin, jen z archivu, s potvrzením. Pokud vazby existují → zakázat a nabídnout ponechat v archivu.

## Zadání

### 1. Archivace (měkké smazání)

- Akce **„Archivovat"** na detailu + v řádkovém menu u `clients`, `instances`, `leads`, `tickets`. Oprávnění: admin + member (sales NE, ani u svých). Dialog s potvrzením a důvodem (volitelný, do `activity`).
- Route handler nastaví `deletedAt`+`deletedBy`, zapíše `activity` (kind=system, „Archivováno").
- **Všechny seznamy, vyhledávání (cmd+K), dashboard feedy, součty, provize a metriky filtrují `deletedAt == null`.** Projít systematicky — query nebo filtr v každém čtení. Toto je jádro „žádného bordelu": archivovaný klient nesmí nikde probublat.
- Detail archivovaného záznamu (přes přímou URL) jde otevřít, ale je jasně označený banerem „Archivováno dne X uživatelem Y" + akce Obnovit. Nové mutace (nový ticket k archivovanému klientovi apod.) zakázané.

### 2. Kaskáda u archivace klienta

- Archivace klienta NEarchivuje automaticky faktury/provize (historie zůstává), ale: jeho aktivní instance, otevřené tickety a předplatné se taky archivují/ukončí (instance → archiv, subscription → status `cancelled`, otevřené tickety → archiv). V dialogu vypsat, co se archivuje spolu s ním.
- Předplatné `cancelled` = od teď nevznikají nové faktury ani provize (provize z minulých zaplacených zůstávají).

### 3. Archiv (Nastavení → Archiv, admin+member)

- Záložky/filtr dle typu (klienti/instance/leady/tickety). Tabulka archivovaných: název, typ, kdo a kdy archivoval.
- Akce **Obnovit** (zruší `deletedAt`/`deletedBy`, `activity` „Obnoveno") — vrátí do provozu. U klienta obnova nevrací automaticky kaskádu (instance/předplatné obnovíš zvlášť — zmínit v UI).

### 4. Trvalé smazání (jen admin, jen z archivu)

- Akce **„Trvale smazat"** jen na archivovaných záznamech, jen admin.
- Handler PŘED smazáním ověří vazby:
  - `clients`: žádné faktury, provize, instance, tickety, card-tokens, subscriptions.
  - `instances`: žádné tickety na ni vázané.
  - `leads`: nebyl konvertován (žádný klient s `leadId`).
  - `tickets`: žádné navázané úkoly (`ticketId`).
- Pokud vazba existuje → 409 + srozumitelná zpráva „Nelze trvale smazat — má navázané faktury/…; ponechej v archivu." Pokud čisté → smazat dokument + jeho `activity` záznamy, potvrzení přepsáním názvu v dialogu.
- Žádné kaskádové mazání faktur/provizí — to je tvrdá hranice.

### 5. Rules + úklid Storage

- Rules: `deletedAt`/`deletedBy` smí nastavit jen admin/member přes API (klientsky deny write na tato pole). Trvalé `delete` na dokumentech jen přes admin SDK (rules: client delete deny).
- Při trvalém smazání instance/ticketu uklidit i případné Storage přílohy (ticket attachments).
- Indexy: seznamy teď filtrují `deletedAt` — přidat/upravit composite indexy, kde to query vyžaduje (např. `clients(deletedAt, ...)`). Po změně `firebase deploy --only firestore` (ověřit `Deploying to 'markly-1bd84'`).

## Akceptační kritéria

- Archivovaný klient zmizí ze seznamu, vyhledávání, dashboardu i provizních součtů; jeho instance/tickety/předplatné se archivují/ukončí spolu s ním; faktury a historické provize zůstávají.
- Obnovení vrátí klienta do provozu.
- Trvalé smazání projde jen u záznamu bez vazeb; u klienta s fakturou vrátí 409 a nabídne archiv.
- Faktury nelze smazat (jen stornovat) — v UI není žádná mazací akce.
- Sales nevidí archivační akce; archiv je jen admin/member, trvalé mazání jen admin.
- Lint + build čisté, ověření za admin i sales, work-log, stav fáze, commit (`feat: [changelog] archivace a mazání záznamů`).
