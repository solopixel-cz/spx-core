# Fáze 17 — Sales vidí jen své klienty

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 16 (`clients.salesOwnerUid`).

## Záměr

Obchodník (role sales) nově vidí **pouze klienty přiřazené na sebe** (`salesOwnerUid == uid`) — v seznamu, detailu i ve všech navázaných datech. Když sales vytvoří nového klienta, automaticky se mu přiřadí. Admin/member vidí dál všechno. Leady a prospekti zůstávají sdílené (beze změny).

## Zadání

### 1. Klienti

- `/klienti` (Server Component): pro sales query `where('salesOwnerUid', '==', uid)`. Sloupec/filtr vlastníka pro sales skrýt (je zbytečný).
- Detail klienta: pokud sales otevře cizího klienta (přímou URL), `notFound()` — ověření na serveru, ne v UI.
- `GET/PATCH /api/clients*`: guard — sales smí číst/měnit jen své; pole `salesOwnerUid` smí měnit jen admin/member (ze sales payloadu ignorovat).
- **Auto-přiřazení:** `POST /api/clients` — pokud má tvůrce roli sales, server nastaví `salesOwnerUid = uid` bez ohledu na payload. Dialog „Nový klient" pro sales select vlastníka vůbec nezobrazuje.
- Konverze leadu (Vyhráno) sales uživatelem: klient vzniká s `salesOwnerUid` z leadu (z fáze 16) — ověřit, že funguje i když konvertuje sales sám.

### 1b. Vlastníkem může být i admin/member

- Select „Obchodní vlastník" na detailu klienta (fáze 16) rozšiř ze sales uživatelů na **všechny aktivní uživatele** — admin si může házet klienty na sebe.
- Vznik provize se NEMĚNÍ: provizní záznam vzniká jen vlastníkům s rolí sales (admin/member vlastník = bez provize) — ověř, že to tak po změně selectu zůstává.
- `/moje-vizitky` zůstává jen pro sales (admin vidí vše jinde). Konverze leadu: `salesOwnerUid` se nově propisuje z `ownerUid` leadu bez ohledu na roli vlastníka.
- Aktualizuj komentář u `salesOwnerUid` ve `spec/context/data-model.md` (vlastník = kdokoli, provize jen sales).

### 2. Navázaná data — utěsnit všechny kanály

Pro roli sales filtrovat na vlastní klienty všude, kde se klientská data objevují:

- **Tickety**: seznam jen tickety vlastních klientů; dialog nového ticketu nabízí jen vlastní klienty; detail cizího → 404.
- **Úkoly**: úkoly přiřazené sales uživateli zůstávají vidět vždy (i kdyby byly k cizímu klientovi — řeší je on); ve filtrech/dialogu nabízet jen vlastní klienty.
- **Podklady** (`/podklady`): jen submissions navázané na vlastní klienty (přes card-tokens.clientId); generování odkazu jen u vlastních.
- **Aktivita** (`/aktivita` + dashboard): záznamy entityType=client/ticket/invoice jen pro vlastní klienty (invoice už je skryté z fáze 10); leady/prospekti beze změny.
- **Cmd+K vyhledávání**: klienti ve výsledcích jen vlastní; tickety jen vlastních klientů.
- **Dashboard**: ověřit, že onboarding přehled a feed pro sales obsahují jen vlastní klienty (feed by měl už z fáze 12 — zkontrolovat).

### 3. Rules

- `clients`: read pro admin/member; pro sales jen `resource.data.salesOwnerUid == request.auth.uid`. (Pokud nějaké klientské čtení `clients` existuje — jinak je to pojistka.)
- `instances`, `tickets`: pro sales čtení omezit přes lookup `get(.../clients/$(resource.data.clientId)).data.salesOwnerUid == request.auth.uid`, pokud se čtou klientsky (realtime tickety!) — jinak přesunout čtení pro sales na API. Zvol jednodušší bezpečnou variantu a zdokumentuj ji.
- Po změně `firebase deploy --only firestore` (ověřit `Deploying to 'markly-1bd84'`).

### 4. Dokumentace

- `spec/context/project.md`: aktualizovat popis sales role (vidí jen své klienty; auto-přiřazení při vytvoření; leady/prospekti sdílené).

## Akceptační kritéria

- Sales v seznamu, vyhledávání, ticketech, podkladech ani aktivitě neuvidí nic z cizích klientů; přímé URL na cizí entity vrací 404; network tab bez cizích dat (projít odpovědi API).
- Realtime seznam ticketů pro sales nespadne na rules a ukazuje jen vlastní.
- Klient vytvořený sales uživatelem má okamžitě `salesOwnerUid` tvůrce a je pro něj viditelný; payload s cizím `salesOwnerUid` je ignorován.
- Admin/member vidí vše beze změny; změna vlastníka adminem klienta okamžitě přesune mezi obchodníky.
- Admin jde nastavit jako vlastník klienta; zaplacení faktury takového klienta NEvytvoří provizi.
- Lint + build čisté, ověření za admin i sales (dvě okna), work-log, stav fáze, commit (`feat: [changelog] obchodník vidí jen své klienty`).
