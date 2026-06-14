# Fáze 25 — Archivace a mazání kontaktů v Oslovení

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 20 (archivace) a 13/14 (prospekti/oslovení). Stejné principy jako fáze 20 — žádný bordel v DB ani aplikaci.

## Záměr

Kolekce `prospects` (v UI „Oslovení") nebyla zahrnuta do archivace ve fázi 20. Admin potřebuje uklidit testovací i nepotřebné kontakty — archivovat (skrýt, vratné) a u skutečných omylů trvale smazat. Bez osiřelých vazeb a rozbitých součtů.

## Zadání

### 1. Měkké smazání (archivace)

- `prospects` dostane `deletedAt` + `deletedBy` (stejně jako entity z fáze 20; doplnit do `spec/context/data-model.md` a zod schématu).
- Akce **„Archivovat"** v detailu kontaktu (Sheet) + v řádkovém menu seznamu Oslovení. Oprávnění: **admin + member** (sales ne).
- **Všechny pohledy na Oslovení filtrují `deletedAt == null`**: seznam (Volní/Moji/Všichni), vyhledávání (cmd+K), dashboard karty „Oslovení tento týden" / „Oslovování celkem", attention feed (follow-upy), statistiky. Projít systematicky — archivovaný kontakt nesmí nikde probublat ani do čísel.
- Archivace přes route handler, zápis `activity` (kind=system, „Archivováno").

### 2. Archiv (Nastavení → Archiv)

- Do existující stránky `/nastaveni/archiv` (fáze 20) přidat typ **„Oslovení"** (kontakty): tabulka archivovaných, kdo a kdy archivoval. Akce **Obnovit** (zruší `deletedAt`).

### 3. Trvalé smazání (jen admin, jen z archivu)

- Akce **„Trvale smazat"** na archivovaném kontaktu, jen admin, potvrzení přepsáním jména.
- Ověřit vazby PŘED smazáním:
  - kontakt nebyl konvertován na lead (`leadId` prázdné),
  - nemá navázané `outreachEmails` (odeslaná oslovení) — pokud má, nabídnout ponechat v archivu (kvůli historii odeslání). Případně dovolit smazat i s `outreachEmails`, ale pak smazat i ty záznamy + jejich `activity` v jedné dávce — zvol konzistentní variantu a zdokumentuj.
- Při smazání odstranit i `activity` záznamy kontaktu (entityType=prospect).
- **Hromadné smazání testovacích:** v archivu umožnit výběr více kontaktů (checkbox) a „Trvale smazat vybrané" — ať admin uklidí testovací dávku najednou (batched delete po 500, jen kontakty bez blokujících vazeb; ostatní přeskočit s výpisem).

### 4. Rules + indexy

- `prospects`: `deletedAt`/`deletedBy` smí nastavit jen admin/member přes API (klientsky deny na tato pole); client delete deny (trvalé mazání jen admin SDK).
- Pohledy filtrují `deletedAt` — upravit/přidat indexy, kde to query vyžaduje. Po změně `firebase deploy --only firestore` (ověřit `Deploying to 'markly-1bd84'`).

## Akceptační kritéria

- Archivovaný kontakt zmizí ze všech pohledů Oslovení i ze statistik; jde obnovit z Archivu.
- Trvale smazat lze jen archivovaný kontakt bez blokujících vazeb (nebo s kaskádou dle zvolené varianty); hromadné smazání ukliď testovací dávku.
- Sales nevidí archivační akce; trvalé mazání jen admin.
- Lint + build čisté, ověření za admin i sales, work-log, stav fáze, commit (`feat: [changelog] archivace a mazání kontaktů v Oslovení`).
