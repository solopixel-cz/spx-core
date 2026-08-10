# Fáze 31E — Ucelení tvorby faktur

> Navazuje na fázi 31 (A–D). Cíl: udělat vytváření faktur v CRM ucelené a pohodlné.

## Požadavky (od zadavatele, 2026-08-10)

1. **Slevy na položce** — u řádku faktury jde zvolit sleva z přednastavených hodnot **5 / 10 / 15 / 20 / 25 / 30 %** (+ žádná). Řádková cena i součet slevu zohlední.
2. **Šablony položek** — katalog přednastavených řádků (popis + cena), které si zadavatel **sám přidává/edituje**. Ve formuláři faktury se dají vložit jedním kliknutím (a dál upravit).
3. **Vystavit z klienta / předplatného** — tlačítko „Vystavit fakturu" na detailu klienta (předvyplněný klient) a z konkrétního předplatného (předvyplněné položky z plánu).
> ⚠️ Body o Fakturoidu níže jsou **historické** — Fakturoid odstraněn ve fázi 32 (vlastní PDF + QR, CRM = jediná evidence). Viz [`32-fakturace-bez-fakturoidu.md`](32-fakturace-bez-fakturoidu.md).

4. **Sjednocení čísel CRM ↔ Fakturoid** — faktura má stejné číslo v CRM i ve Fakturoidu. **Rozhodnutí:** CRM posílá své číslo (`number`) do Fakturoidu při zakládání dokladu (Fakturoid to pole přijímá). Ověřit, že Fakturoid formát/sekvence nepadá; jinak varianta B = CRM přebere `fakturoidNumber` jako kanonické.
5. **UX drobnosti** — hledatelný výběr klienta, rozumné defaulty, režim neplátce DPH (`vat_rate: 0`).
6. **0 Kč pravidlo** — ✅ hotovo (cron přeskočí předplatné s `amount <= 0`).

## Rozfázování

- **E2 (první) — Slevy na položce:** `invoiceItemSchema` + `discountPercent` (0/5/10/15/20/25/30), `invoiceItemsTotal` slevu aplikuje, ve formuláři per-řádek Select, na detailu sloupec sleva, Fakturoid: efektivní `unit_price` + sleva v názvu řádku.
- **E1 — Šablony položek:** kolekce `invoiceItemTemplates` (`name`, `unitPrice`, `discountPercent?`), správa v Nastavení (CRUD, admin), ve formuláři picker „Vložit šablonu".
- **E3 — Vystavit z klienta/předplatného:** reuse `InvoiceFormDialog` s předvyplněným `clientId`/položkami; trigger na detailu klienta a u předplatného.
- **E4 — Sjednocení čísel:** poslat `number` do Fakturoidu (`lib/fakturoid.ts createInvoice`), ověřit; UI ukáže jedno číslo.
- **E5 — UX:** searchable client picker, defaulty.

## Konvence
Vývoj teď proti `devel` databázi (izolovaná data). Quality loop: lint + build, ověření v prohlížeči, commit se schválením. Data model změny → `spec/context/data-model.md`.
