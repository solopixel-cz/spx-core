# Fáze 16 — Provizní systém pro obchodníky

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Datový model (`commissions`, `settings/commission`, `clients.salesOwnerUid`, `users.commissionRate`) je už ve `spec/context/data-model.md` — drž se ho včetně pravidel v něm popsaných.

## Záměr

Obchodník (role sales) dostává doživotní podíl (default 20 %) z každé **zaplacené** faktury svých klientů. Potřebujeme: automatický vznik provizí, měsíční vyúčtování pro admina (kolik komu poslat na fakturu) a obchodníkův přehled vlastních vizitek a výdělků. Vědomá výjimka z fáze 10: sales nově vidí předplatné a provize **svých** klientů — ostatní finance zůstávají skryté.

## Zadání

### 1. Obchodní vlastník klienta

- Konverze leadu (Vyhráno): pokud má lead `ownerUid` s rolí sales, zapsat do `clients.salesOwnerUid`.
- Detail klienta: pole „Obchodní vlastník" (select ze sales uživatelů, mění jen admin/member, prázdné = bez provize). Změna → `logActivity`.
- Seznam klientů: sloupec vlastníka (avatar) + filtr.

### 2. Vznik provize

- V handleru „Označit zaplaceno" (faktury): po úspěšném zápisu `paidAt` vytvořit provizi v téže transakci — jen pokud klient má `salesOwnerUid` s rolí sales. ID dokumentu = invoiceId (opakované kliknutí nevytvoří duplicitu). Sazba: `users.commissionRate` ?? `settings/commission.defaultRate`, zaokrouhlení na celé koruny.
- Storno faktury: pokud k ní existuje provize — `pending` → status `reversed`; `paid` → vytvořit záporný záznam `{invoiceId}-reversal` se statusem `pending` (odečte se v příštím vyúčtování).

### 3. Admin přehled `/provize` (sekce Finance, jen admin/member)

- Souhrn per obchodník: karta se jménem, sazbou, **K vyplacení** (suma pending vč. záporných), Vyplaceno letos.
- Rozpad: tabulka pending záznamů obchodníka — klient, faktura (číslo, proklik), zaplaceno dne, základ, %, provize.
- Akce **„Označit vyplacené"** (všechny pending záznamy obchodníka, checkbox výběr): dialog s volitelnou poznámkou (číslo došlé faktury od obchodníka) → `status='paid'`, `paidAt`, `payoutNote`. + `logActivity` na klienty není třeba — stačí záznam v provizi.
- Tlačítko „Kopírovat podklad" — textový souhrn pro obchodníka (období, položky, celkem), aby věděl, na kolik fakturovat.
- Historie vyplacených (filtr období/obchodník).

### 4. Stránka obchodníka `/moje-vizitky` (jen sales)

- Sidebar (sekce Obchod, jen pro sales): „Moje vizitky".
- Souhrn nahoře: **Čeká na vyplacení**, **Vyplaceno letos**, **Měsíční provize** (suma aktivních předplatných mých klientů × moje sazba).
- Tabulka mých klientů: jméno, stav vizitky (instance), tarif + cena/měs., moje provize/měs. Bez čísel faktur a bez cizích klientů.
- Tabulka provizí: období (měsíc zaplacení), klient, částka, stav (čeká/vyplaceno). Záporné storno položky zřetelně.

### 5. Nastavení

- Nastavení (admin): default sazba (`settings/commission`); u uživatele s rolí sales pole „Sazba provize" (prázdné = default).

### 6. API, rules, indexy

- Veškerá data přes route handlers (admin SDK): sales endpointy striktně filtrují `salesUid == auth.uid` / `salesOwnerUid == auth.uid` — ověřit, že payload neobsahuje cizí data.
- Rules: `commissions` klientsky read jen vlastní (`resource.data.salesUid == request.auth.uid`) nebo admin/member; write deny (vše přes API). `subscriptions` pro sales: čtení jen přes API (rules beze změny — deny).
- Indexy: `commissions(salesUid, status)`, `commissions(status, earnedAt)`. Po změně `firebase deploy --only firestore` (ověřit `Deploying to 'markly-1bd84'`).
- Aktualizuj `spec/context/project.md` — sekci o sales roli doplň o výjimku (vidí předplatné a provize svých klientů).

## Akceptační kritéria

- Zaplacení faktury klienta s vlastníkem-sales vytvoří provizi se správnou částkou; opakované kliknutí ani obnovení stránky nevytvoří druhou; klient bez vlastníka provizi nevytvoří.
- Storno zaplacené faktury vygeneruje záporný záznam, který se odečte ve vyúčtování.
- Sales na `/moje-vizitky` vidí jen své klienty a provize (ověřit network tab i přímým voláním API pod jiným uid); `/provize` mu vrátí 403/redirect.
- „Označit vyplacené" uzavře záznamy a „Kopírovat podklad" dá správný součet.
- Lint + build čisté, ověření za admin i sales, work-log, stav fáze, commit (`feat: [changelog] provizní systém pro obchodníky`).
