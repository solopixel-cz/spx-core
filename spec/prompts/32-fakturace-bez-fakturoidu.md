# Fáze 32 — Odstřižení Fakturoidu (vlastní PDF, QR platba, evidence)

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 31 (A–D). Datový model faktur je ve `spec/context/data-model.md`.

## Záměr

Přesunout fakturaci **plně do CRM** a přestat používat Fakturoid (úspora ~4 000 Kč/rok za předplatné Fakturoidu). CRM se stává **jedinou evidencí faktur**.

Fakturoid dnes reálně zajišťuje jen dvě věci — obě nahradíme:
1. **Generování PDF** dokladu → vlastní PDF generátor v CRM.
2. **Stav zaplacení z ČSOB** → zrušit; platby se budou označovat **ručně** (tlačítko „Zaplaceno" už existuje).

Vše ostatní (čísla faktur, položky, VS, cron z předplatných, odeslání e-mailem + tracking, provize, upomínky) už CRM umí a **zůstává beze změny**.

## Rozhodnutí zadavatele (potvrzeno 2026-08-10)

- **Stav platby:** jen ruční „Zaplaceno" (žádný import bankovního výpisu). ČSOB sync se odstraní.
- **Účetní evidence:** CRM = jediná evidence. Doplnit **export seznamu faktur** (CSV + hromadné PDF za období) pro účetní/daňové přiznání.
- **QR platba:** ANO — na PDF i do e-mailu přidat QR kód (SPAYD / Czech QR Payment) s předvyplněnou částkou, číslem účtu a VS.
- Zadavatel je **neplátce DPH** → doklad bez DPH (jednodušší; povinná poznámka „Nejsem plátce DPH").

## Předpoklady / knihovny

- PDF: `@react-pdf/renderer` (běží v Node runtime na Vercelu, `renderToBuffer`, bez headless Chrome).
- QR: `qrcode` (`toDataURL` → PNG data URI vložené do PDF i e-mailu).
- SPAYD string sestavíme sami; ACC preferuje IBAN → do nastavení přidat IBAN (fallback: dopočítat CZ IBAN z čísla účtu + kódu banky).

---

## Fáze A — Fakturační údaje: dodavatel (nastavení) + odběratel (klient)

Faktura má dvě strany. **Dodavatel** = my (chybí úplně, dnes jen `COMPANY_BANK_ACCOUNT` env). **Odběratel** = klient (má `name/company/ico/dic/email/phone`, ale **chybí fakturační adresa**). Klient je zdrojem dat pro fakturu, proto ho rozšíříme.

### A1 — Rozšíření klienta o fakturační adresu

1. **Datový model** — do `lib/schemas/client.ts` (`clientSchema` i `clientFormSchema`) přidat:
   ```ts
   billingStreet?: string    // ulice a č.p.
   billingZip?: string       // PSČ
   billingCity?: string      // město
   ```
   (Strukturovaně, aby šlo formátovat na dokladu; IČO/DIČ/název/e-mail už klient má.)
2. **Formulář** — `components/clients/client-form-dialog.tsx`: sekce „Fakturační údaje" (ulice, PSČ, město) vedle IČO/DIČ. `app/api/clients/route.ts` + `[id]/route.ts` propsat nová pole.
3. **Předvyplnění z podkladů** — pokud podklad z formuláře (`card-submission`) obsahuje adresu/IČO, nabídnout je při zakládání klienta (viz `submission-view-model.ts`, které už `ico` mapuje). Volitelné, když nezdrží.
4. **Detail klienta** — zobrazit fakturační adresu v `client-detail-client.tsx`.
5. Zapsat nová pole do `spec/context/data-model.md` (sekce `clients`).

### A2 — Dodavatelské údaje v nastavení

1. **Datový model** — `settings/company` doc. Schéma `lib/schemas/company.ts`:
   ```ts
   {
     name: string            // "SoloPixel — Jméno Příjmení" / název
     address: string         // ulice, PSČ, město (víceřádkově)
     ico?: string
     dic?: string            // neplátce → prázdné
     bankAccount: string     // 123456789/0300 (zobrazení + fallback)
     iban?: string           // pro QR (ACC); když prázdné, dopočítat
     email?: string
     phone?: string
     web?: string
     vatNote: string         // default "Nejsem plátce DPH."
     invoiceFooter?: string  // volitelná patička dokladu
   }
   ```
2. **API** — `app/api/settings/company/route.ts` (`GET` requireAuth, `PUT` requireRole("admin")), vzor podle `settings/commission`.
3. **UI** — `app/(app)/nastaveni/fakturacni-udaje/page.tsx` + client formulář; dlaždice „Fakturační údaje" (icon `Receipt`/`Building2`, roles `["admin"]`) do `nastaveni/page.tsx`.
4. Zapsat `settings/company` do `spec/context/data-model.md`.

### Akceptace A
Klient jde uložit s fakturační adresou (a zobrazí se na detailu). Admin vyplní a uloží dodavatelské údaje; načtou se zpět. Lint+build čistý.

---

## Fáze B — Vlastní PDF faktury + QR platba

1. **SPAYD helper** — `lib/spayd.ts`: `buildSpayd({ iban, amount, vs, message })` → `SPD*1.0*ACC:<IBAN>*AM:<amount>*CC:CZK*X-VS:<vs>*MSG:<msg>`. Helper `accountToIban(account)` pro fallback (CZ IBAN z předčíslí-číslo/kód banky).
2. **PDF komponenta** — `lib/pdf/invoice-pdf.tsx` (`@react-pdf/renderer`): hlavička (dodavatel ze `settings/company` vs. odběratel = klient: `name/company/ico/dic/billingStreet/billingZip/billingCity`), číslo faktury, vystaveno/splatnost, VS, tabulka položek (popis, ks, cena, sleva, řádek), součet, poznámka `note`, „Nejsem plátce DPH", QR platba (PNG). Funkce `renderInvoicePdf(invoice, company, client): Promise<Buffer>`.
3. **Endpoint** — `GET /api/invoices/[id]/pdf` (`requireRole("admin","member")`): načte fakturu+klienta+`settings/company`, vrátí `application/pdf` (inline/attachment). 404/400 ošetřit.
4. **E-mail** — v `app/api/invoices/[id]/send/route.ts` nahradit Fakturoid PDF (`downloadInvoicePdf`) za `renderInvoicePdf(...)`; QR i do těla e-mailu (data URI `<img>`), údaje z `settings/company` místo `COMPANY_BANK_ACCOUNT` env.
5. **UI** — na detailu faktury (`components/invoices/invoice-detail-client.tsx`) tlačítko **„Stáhnout PDF"** (odkaz na endpoint). Odstranit sekci „Do Fakturoidu / Fakturoid {číslo}".

### Akceptace B
PDF se vygeneruje se správnými údaji a QR kódem (test: naskenovat → správná částka/účet/VS). Odeslaný e-mail má přílohu PDF z CRM a QR v těle. Lint+build čistý, ověřeno v prohlížeči.

---

## Fáze C — Export evidence pro účetní

1. **CSV export** — `GET /api/invoices/export?from=&to=` (`requireRole("admin","member")`): seznam faktur za období → CSV (číslo, klient, IČO, částka, vystaveno, splatnost, zaplaceno, stav, VS). `text/csv; charset=utf-8` s BOM (Excel/CZ).
2. **Hromadné PDF** (volitelné, když nezdrží): ZIP faktur za období, nebo prozatím odkaz „stáhnout jednotlivě".
3. **UI** — na `fakturace/page.tsx` (nebo v nastavení) tlačítko „Export" s výběrem období.

### Akceptace C
Export vrátí CSV se správnými řádky za zvolené období; otevře se v Excelu s diakritikou.

---

## Fáze D — Odstranění Fakturoidu

Provést jako **poslední**, až B+C fungují.

1. Smazat `lib/fakturoid.ts` a `app/api/invoices/[id]/fakturoid/route.ts`.
2. `app/api/cron/billing/route.ts` — odstranit sekci 3 (sync stavu z Fakturoidu) a import; ponechat generování z předplatných + overdue.
3. `app/api/invoices/[id]/send/route.ts` — odstranit importy/větev Fakturoidu (už nahrazeno v B).
4. `components/invoices/invoice-detail-client.tsx` — odstranit `pushFakturoid`, `fakturoidNumber`, `fakturoidConfigured` (hotovo v B).
5. Datový model (`spec/context/data-model.md`) — z `invoices` odstranit `fakturoidId/fakturoidNumber/fakturoidStatus` a `pdfPath` komentář upravit (PDF nově generuje CRM); poznámky o „Fakturoid = účetní pravda" přepsat na „CRM = evidence".
6. `.env.example` + `.env.local` — odstranit `FAKTUROID_*` (a `COMPANY_BANK_ACCOUNT`, nahrazeno `settings/company`). Migrace: existující fakturám ponechat `fakturoidId` v datech neškodí; jen je přestat používat.
7. Aktualizovat `spec/prompts/31-fakturace-rozsireni.md` / kontext, kde se mluví o Fakturoidu jako o zdroji pravdy.

### Akceptace D
`npm run lint` + `npm run build` čisté, žádné importy `lib/fakturoid`. Cron běží bez Fakturoidu. Odeslání i PDF fungují. Detail faktury bez Fakturoid prvků.

---

## Quality loop (celé fáze)
Lint → build → ověření v prohlížeči (vystavit → PDF → odeslat → QR → export) → work-log → stav v `index.md` → commit se schválením per sub-fáze.

## Poznámka k datům
Existující faktury s `fakturoidId` zůstanou; nová logika je nepoužívá. Fakturoid účet lze po ověření fáze D zrušit (úspora předplatného).
