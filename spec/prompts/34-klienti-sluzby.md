# Fáze 34 — Klient jako osoba i firma, služby místo „vizitek", víc předplatných

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Datový model je ve `spec/context/data-model.md` — **změny modelu zapiš nejdřív tam** (u každého kroku zvlášť, až při jeho implementaci).

## Záměr

CRM dnes předpokládá, že **klient = finanční poradce (osoba) s jednou digitální vizitkou a jedním předplatným tarifu vizitky**. Realita je širší:

- klient může být **osoba i firma**,
- ne každý má vizitku: někdo má **web**, někdo jen **jednorázovou službu** (např. „vytvořit marketingový prospekt"),
- jeden klient může platit **víc věcí najednou** (vizitka + správa webu).

Cíl: model a UI, které tohle unesou, **bez migrace stávajících dat** (chybějící nová pole = dnešní chování).

## Rozhodnutí zadavatele (potvrzeno 2026-09-29)

- **Firma má jednu kontaktní osobu** (jméno, e-mail, telefon). Víc kontaktů zatím ne.
- **Jednorázové služby se evidují jako zakázky se stavem** (poptávka / rozpracováno / dodáno), s cenou a vazbou na fakturu.
- **Klient může mít víc předplatných najednou**, každé s typem služby a vlastním názvem.
- Postup: nejdřív toto zadání ke schválení, pak implementace **po krocích A → B → C**, každý krok samostatně nasaditelný (vlastní commit + verze).

---

## Krok A — Typ klienta: osoba / firma

### Datový model (`clients`)
```ts
kind?: 'person' | 'company'   // chybí = 'person' (všichni stávající klienti)
contactName?: string          // jen firma: kontaktní osoba (celé jméno)
```
- **Osoba:** `name` = jméno a příjmení (jako dnes), `company` = volitelná značka/síť (OVB, ZFP…).
- **Firma:** `name` = název firmy, `contactName` = kontaktní osoba, `email`/`phone` = kontakt na ni. `company` se u firmy nepoužívá (skrýt).
- Zod: `lib/schemas/client.ts` (`clientSchema` + `clientFormSchema`), API `app/api/clients/route.ts` + `[id]/route.ts`.

### Oslovení v e-mailech — jeden helper
Dnes se křestní jméno počítá na 6+ místech (`name.split(" ")[0]` / `firstName()`), u firmy by vyšlo „Dobrý den, Stavby“. Zavést `greetingName(client)` v `lib/marketing/personalize.ts`:
- osoba → `firstName(name)` (dnešní chování),
- firma → `firstName(contactName)`, bez kontaktu → celý název firmy (prázdné oslovení by v šablonách dalo „Dobrý den, ,").
- `contactPersonName(client)` = celé jméno člověka, se kterým komunikujeme (firma → kontakt). Používá se pro token formuláře podkladů (web ho předvyplní jako „Jméno a příjmení") a oslovení v e-mailu s fakturou.

Nahradit v: `app/api/clients/[id]/route.ts:179, 256`, `app/api/card-tokens/route.ts:84`, `components/clients/marketing-email-dialog.tsx:57`, `components/clients/delivery-dialog.tsx:59` (nebo jejich nástupcích po fázi 33), `app/api/marketing/campaigns/route.ts:216`, `app/api/invoices/[id]/send/route.ts:75` (dnes celé jméno, fallback „kliente").

### Faktura — odběratel
- **Oprava nesouladu:** PDF (`lib/pdf/invoice-pdf.tsx:271`) ukazuje jen `name`, formulář (`components/invoices/invoice-form.tsx:188`) `company || name`. **Správně je PDF:** odběratel = `name` (osoba jako OSVČ s IČO, firma svým názvem); značka (`company`) odběratel není. Náhled ve formuláři srovnán podle PDF (`name`, pod ním značka), PDF beze změny.

### UI
- Formulář klienta: přepínač **Osoba / Firma** nahoře; u firmy popisky „Název firmy", „Kontaktní osoba", skrýt „Firma / značka".
- Seznam klientů: ikona osoby/firmy u jména; u firmy podtitulek = kontaktní osoba. Hledání i přes `contactName` (`app/api/search/route.ts`).
- Detail klienta: avatar s iniciálami jen u osoby, u firmy ikona budovy; kontaktní osoba v hero.
- Lead → klient (`app/api/leads/[id]/route.ts:100`): `kind` = `company`, když lead nemá jméno osoby, jinak `person` (nebo volba v dialogu výhry). `advisorSlug` generovat jen když bude vizitka (viz B).

### Akceptace A
Založím firmu s kontaktní osobou → v seznamu má ikonu firmy, e-mail z detailu ji osloví křestním jménem kontaktu, faktura má odběratele = firma. Stávající klienti vypadají a fungují beze změny.

---

## Krok B — Služby: vizitky, weby a zakázky

### Datový model
- **`instances` zůstávají** (technická nasazení: vizitka `card` / web `web`, doména, deploy, stav setup/live/…). Beze změny schématu.
- **Nová kolekce `projects`** (jednorázové zakázky — jiný životní cyklus než nasazení, proto samostatně):
  ```ts
  {
    clientId: string
    title: string                 // „Marketingový prospekt A5"
    description?: string
    status: 'inquiry' | 'in_progress' | 'delivered' | 'cancelled'
    price?: number                // CZK, orientační / dohodnutá
    invoiceId?: string            // vazba na fakturu (po vyfakturování)
    dueAt?: Timestamp             // termín dodání (volitelné)
    deliveredAt?: Timestamp
    deletedAt?/deletedBy?         // archivace jako ostatní
    createdAt, updatedAt
  }
  ```
  Rules + indexy (`clientId` + `createdAt`), archivace přes `/api/archive` (`validCollections`), kaskáda při archivaci klienta (`lib/archive.ts`), závislost při trvalém mazání.

### UI
- Detail klienta: tab **„Instance" → „Služby"** se dvěma bloky: **Vizitky a weby** (dnešní `instances-tab`) a **Zakázky** (seznam + přidat/upravit/změnit stav).
- Ze zakázky tlačítko **„Vyfakturovat"** → `/invoices/new?clientId=…&project=<id>` s předvyplněnou položkou (název, cena); po uložení faktury zapsat `invoiceId` do zakázky.
- **Akce vázané na vizitku jen když klient vizitku má** (`instances` s `type: 'card'`):
  - „Formulář podkladů" (card-tokens),
  - „Předat vizitku" (delivery; nabízet jen card instance),
  - řádek „Advisor Slug" v informacích.
- Seznam klientů: sloupec „Instance" → **„Služby"** (např. „Vizitka · 1 zakázka").
- Dashboard: volitelně karta „Rozpracované zakázky" (stav `inquiry`/`in_progress`, po termínu zvýraznit) do `lib/attention.ts`.

### Akceptace B
Klient jen se zakázkou nemá v detailu tlačítka pro vizitku; zakázku založím, posunu do „Dodáno", vyfakturuji a faktura je u zakázky vidět. Klient s vizitkou funguje jako dnes.

---

## Krok C — Víc předplatných a obecné tarify

### Datový model (`subscriptions`)
```ts
service?: 'card' | 'web' | 'other'  // chybí = 'card' (všechna stávající)
label?: string                      // název pro web/other: „Správa webu", „Hosting"
instanceId?: string                 // volitelná vazba na konkrétní vizitku/web
plan?: 'basic' | 'pro'              // jen pro service 'card' (dnes povinné → volitelné)
```
- Helper `subscriptionLabel(sub)`: card → `PLANS[plan].label` („Digitální vizitka · Pro růst"), jinak `label`.
- Víc dokumentů na klienta je povoleno (API to už dnes nehlídá — `app/api/subscriptions/route.ts`).

### Místa, která dnes berou jen první předplatné (upravit)
- `app/(app)/clients/[id]/page.tsx:119` (`docs[0]`) → předat **pole** předplatných.
- `components/subscriptions/subscription-card.tsx` → karta pro **jedno** předplatné; detail klienta vykreslí seznam + „Přidat předplatné" (typ služby → u vizitky tarif, jinak název + cena).
- `components/clients/client-invoices-tab.tsx:78` + `app/(app)/invoices/new/page.tsx:36` → `?sub=<subscriptionId>` místo příznaku, **nastavit `subscriptionId`** na faktuře.
- `app/api/cron/billing/route.ts:77` + `invoices/new/page.tsx:50` → text položky přes `subscriptionLabel` (dnes surové „Předplatné basic").
- `app/(app)/clients/page.tsx:31` → agregace: platící = aspoň jedno nezrušené neinterní; Paušál = součet měsíčních cen + počet („2 služby · 1 148 Kč/měs").
- `app/(app)/my-cards/page.tsx:33` + `components/commissions/moje-vizitky-client.tsx:42` → víc předplatných na klienta; **oprava:** lokální `planLabels` (basic/standard/premium) nahradit `PLANS`.
- Dashboard MRR / „Blížící se fakturace" už počítají po dokumentech — jen popisek řádku doplnit o `subscriptionLabel`.
- `lib/archive.ts:63` komentář (kaskáda už ruší všechna).

### Akceptace C
Klientovi přidám druhé předplatné „Správa webu" → v detailu vidím obě, cron vystaví dvě faktury se srozumitelnými názvy položek, seznam klientů ukazuje součet, MRR sedí.

---

## Mimo scope
- Víc kontaktních osob u firmy.
- Předání webu klientovi (obdoba „Předat vizitku" pro web).
- Změna webového formuláře podkladů (zůstává jen pro vizitky).

## Quality loop (každý krok)
Lint + build čisté → ověření v prohlížeči (dev proti `devel` DB; ostrá data jen čtením) → `data-model.md` → work-log + `spec/plans/index.md` → commit se schválením. Verze: každý krok `feat:` = minor.

## Poznámka k datům
Žádná migrace: nová pole jsou volitelná a jejich absence znamená dnešní chování (`kind` = osoba, `service` = vizitka). Rules pro `projects` nasadit `firebase deploy --only firestore`.
