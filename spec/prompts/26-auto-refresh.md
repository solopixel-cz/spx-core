# Fáze 26 — Auto-refresh seznamů po akcích

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. UI/UX fáze — žádná změna datového modelu.

## Záměr

Po běžných operacích (vytvoření kontaktu/klienta, odeslání oslovení, změna stavu, archivace…) se seznam aktualizuje **bez ručního reloadu celé stránky**. Dnes uživatel musí stránku obnovit, aby viděl nový/změněný záznam.

## Princip (důležité — nerozbít role filtry)

Seznamy (Klienti, Oslovení, Faktury, Úkoly, Podklady, Provize) jsou **Server Components** čtoucí přes admin SDK s vynucenými filtry (role sales = jen své, `deletedAt == null`). Auto-refresh proto řešit přes **`router.refresh()`** po úspěšné mutaci — znovu se spustí server komponenta včetně všech filtrů. **Nepřevádět tyto seznamy na klientský `onSnapshot`** (obešlo by serverové filtry a vyžadovalo duplikaci pravidel). Realtime boardy, které už `onSnapshot` mají (kanban leadů, tickety z fáze 7), nechat beze změny.

## Zadání

### 1. Standardní vzor po mutaci
- Po každé úspěšné mutaci (POST/PATCH přes fetch) v komponentě zavolat `router.refresh()` (App Router) + `toast` potvrzení. Vytvořit/ujednotit malý helper nebo konvenci, ať je to všude stejně.
- Zavřít dialog/sheet až po úspěchu; při chybě nechat otevřený s chybovou hláškou.

### 2. Projít a sjednotit místa
Aplikovat na akce, které dnes vyžadují ruční reload:
- **Oslovení:** přidat kontakt, CSV import (po dokončení), zabrat/uvolnit, zapsat kontakt, odeslat oslovení, převést na lead, archivace.
- **Klienti:** nový klient, úprava, změna vlastníka, archivace; instance přidat/upravit.
- **Faktury:** nová faktura, označit zaplaceno, stornovat.
- **Úkoly:** nový úkol, dokončení (optimisticky — viz níže), úprava.
- **Podklady:** označit zpracované.
- **Provize:** označit vyplacené.
- **Nastavení/Uživatelé:** přidat/upravit uživatele, šablony.

### 3. Optimistické UI tam, kde se hodí
- Rychlé přepínače (checkbox „hotovo" u úkolu, zabrání kontaktu) updatovat optimisticky (okamžitá odezva), při chybě vrátit zpět + toast. Zbytek stačí `router.refresh()`.

### 4. Detail v Sheetu
- Po akci v detailu (Sheet) refreshnout jak detail, tak podkladový seznam (`router.refresh()` pokrývá oboje, pokud data jdou ze serveru). Ověřit, že po „odeslat oslovení" se v logu hned objeví záznam bez zavření/otevření sheetu — pokud log čte klientsky, refetchnout ho.

## Akceptační kritéria
- Po vytvoření kontaktu/klienta se objeví v seznamu bez ručního reloadu.
- Po odeslání oslovení se v logu kontaktu hned ukáže „Odesláno oslovení".
- Změna stavu (zaplaceno, dokončení úkolu, archivace) se okamžitě promítne do seznamu i čísel.
- Role filtry a skrytí archivovaných zůstávají vynucené (sales nevidí cizí ani po refreshi).
- Lint + build čisté, ověření za admin i sales, work-log, stav fáze, commit (`feat: [changelog] auto-refresh seznamů po akcích`).
