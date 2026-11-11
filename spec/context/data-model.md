# SPX Core — Datový model (Firestore)

Všechny entity mají `createdAt`, `updatedAt` (Timestamp) a `createdBy` (uid). Typy se definují zod schématy v `lib/schemas/` a odvozují přes `z.infer`.

**Mazání (od fáze 20):** archivovatelné entity (`clients`, `instances`, `leads`, `tickets`) mají volitelné `deletedAt` (Timestamp) a `deletedBy` (uid) — měkké smazání (archivace). Archivované záznamy se nezobrazují v běžných seznamech, vyhledávání ani součtech, ale data zůstávají kvůli historii. Jdou obnovit nebo (jen bez vazeb, jen admin) trvale smazat. **Faktury:** primárně **storno** (status `cancelled`, zachovává doklad). Od fáze 32 je i **trvalé smazání (jen admin)** — `DELETE /api/invoices/[id]` odstraní fakturu vč. navázaných `invoiceEmails`, zaloguje audit u klienta; vznikne mezera v číselné řadě (používat uvážlivě). `activity`, `outreachEmails` se nemažou samostatně (vážou se na jiné entity).

## Kolekce

### `users`
Členové týmu. Dokument ID = Firebase Auth UID.

```ts
{
  email: string
  displayName: string
  role: 'admin' | 'member' | 'sales'  // zrcadlí custom claim, claim je zdroj pravdy
  active: boolean
  photoURL?: string          // profilová fotka (Storage avatars/{uid}), zrcadlí se do Auth
  phone?: string
  senderEmail?: string       // override odesílatele oslovení (musí být na ověřené doméně); bez hodnoty = email. Mění jen admin.
  senderName?: string        // override jména odesílatele; bez hodnoty = displayName. Mění jen admin.
}
```

### `clients`
Klienti — **osoba** (typicky finanční poradce) nebo **firma** (fáze 34A).

```ts
{
  kind?: 'person' | 'company'  // chybí = 'person' (stávající klienti)
  name: string               // osoba: jméno a příjmení; firma: název firmy
  contactName?: string       // jen firma: kontaktní osoba (oslovení v e-mailech)
  greeting?: string          // ruční oslovení v 5. pádě; jen oprava automatiky (`personalGreeting()` skloňuje křestní jméno knihovnou czech-vocative), jinak prázdné
  company?: string           // jen osoba: značka / síť (OVB, ZFP…); u firmy se nepoužívá
  ico?: string               // odběratel na faktuře
  dic?: string
  billingStreet?: string     // fakturační adresa (ulice a č.p.)
  billingZip?: string        // PSČ
  billingCity?: string       // město
  email: string
  phone?: string
  status: 'onboarding' | 'active' | 'paused' | 'churned'
  advisorSlug: string        // vazba na spx-dbc instanci
  salesOwnerUid?: string     // obchodní vlastník — kdokoli z týmu (i admin); plní se z vlastníka kontaktu při převodu z Oslovení (sales = vždy sám), mění jen admin/member.
  notes?: string
  leadId?: string            // historické: odkud klient vznikl (leady zrušené)
  prospectId?: string        // klient vznikl převodem z Oslovení
  hubUid?: string            // Auth UID klientského účtu ve spx-hub (claims { role: 'client', clientId })
  hubInvitedAt?: Timestamp   // poslední odeslaná pozvánka do hubu
  hubInvitedBy?: string      // uid, kdo pozvánku poslal
  hubFeatures?: {            // funkce klientské zóny zapnuté týmem (budoucí placený doplněk); chybí = vypnuto
    stats?: boolean          // Statistiky návštěv vizitky (GA4)
    statsPlus?: boolean      // Rozšířené statistiky (placený doplněk, zadání #22); platí jen se stats, vypnutí stats vypne i statsPlus
    references?: boolean     // Reference (sběr a zveřejnění)
    lectures?: boolean       // Přednášky (zadání #25), na tarif vázané není
  }
}
```

- **Klientská zóna (spx-hub):** „Pozvat do hubu" v detailu klienta (`/clients/[id]/send/hub`, `POST /api/clients/[id]` akce `hub_invite`) založí nebo znovu použije Auth účet pro `email` klienta, nastaví claims a pošle pozvánku s odkazem na přihlášení do hubu (`HUB_URL/login?email=…`). Účet z týmu ani klientský účet jiného klienta nepřepíše (`lib/hub.ts`).

### `instances`
Nasazený produkt klienta — buď **DBC vizitka** (`type: 'card'`, má `advisorSlug`), nebo **web** (`type: 'web'`, má `hosting`). Obvykle 1:1 ke klientovi, ale model umožňuje víc.

```ts
{
  clientId: string
  type: 'card' | 'web'       // 'card' = DBC vizitka (má slug), 'web' = klientský web (má hosting)
  advisorSlug?: string       // povinný jen pro vizitku (type === 'card')
  hosting?: string           // jen pro web: Vercel | Wedos | Forpsi | Netlify | Cloudflare
  ga4PropertyId?: string     // číselné Property ID z GA4 (ne měřicí ID G-…) — statistiky v hubu; čte ho spx-hub přes service account
  ga4ConnectedAt?: Timestamp | null           // jen web: ručně odškrtnuto „GA4 napojeno“ (service account má přístup do property)
  searchConsoleConnectedAt?: Timestamp | null // jen web: ručně odškrtnuto „Search Console napojeno“ (web ověřený, service account přidaný)
  domain: string             // např. jmeno.solopixel.cz (vizitka) nebo vlastní doména (web)
  status: 'setup' | 'live' | 'maintenance' | 'offline'
  repoUrl?: string
  deployUrl?: string
  features: string[]         // zapnuté moduly (kalkulačky, AI chat, …)
  notes?: string
}
```

- **Kontrola měření webů:** u webu dvě ruční zaškrtnutí (GA4, Search Console), přepínají se v záložce Služby (`PATCH /api/instances/[id]` s `ga4Connected` / `searchConsoleConnected`). Dashboard (admin, member) ukazuje „Weby bez měření“: webové instance mimo `offline` a archiv, kterým chybí jedno z nich nebo `ga4PropertyId`. Vizitky se nekontrolují (GA4 a Search Console řeší společný základ na solopixel.cz).

### `projects`
Jednorázové **zakázky** klienta (fáze 34B), např. marketingový prospekt. Oddělené od `instances` (jiný životní cyklus: poptávka → dodáno → faktura). V UI detailu klienta záložka **Služby** = `instances` (Vizitky a weby) + `projects` (Zakázky).

```ts
{
  clientId: string
  title: string
  description?: string
  status: 'inquiry' | 'in_progress' | 'delivered' | 'cancelled'  // Poptávka / Rozpracováno / Dodáno / Zrušeno
  price?: number             // CZK
  invoiceId?: string         // faktura vystavená ze zakázky (smazání faktury ho vyčistí)
  dueAt?: Timestamp          // termín dodání
  deliveredAt?: Timestamp    // nastaví se při přechodu do delivered, smaže při odchodu
  deletedAt?/deletedBy?      // archivace (/api/archive), kaskáda při archivaci klienta
}
```
Rules: read `isAuth`, write jen Admin SDK. Dotazy jen `where clientId` bez orderBy (řazení v paměti) → bez indexu.

### `domains`
Vlastní (zakoupené) domény. 1:N ke klientovi — klient může mít víc domén. Doména může být i bez klienta (`clientId: null`) a přiřadit se později ve správě domén. Odlišné od `instances.domain` (to je solopixel.cz subdoména vizitky); tady jde o doménu, kterou si klient koupil u registrátora.

```ts
{
  clientId: string | null    // null = nepřiřazená (vidí a spravuje jen admin/member)
  name: string               // doména, např. jmeno.cz
  registrar?: string         // u koho zakoupena (Wedos, Forpsi, GoDaddy, …)
  account?: string           // pod jakým účtem je vedena
  hosting?: string           // kde web/DNS běží (Vercel, Wedos, Forpsi, …) — odlišné od registrátora
  purchasedAt?: Timestamp     // kdy zakoupena
  renewalAt?: Timestamp       // datum obnovení/expirace — pohání připomínky
  autoRenew?: boolean         // automatické obnovení zapnuto (pak cron netlačí připomínku)
  price?: number | null       // cena obnovení v Kč za rok (náklady /costs ji počítají po měsících)
  note?: string
  renewalReminderSentAt?: Timestamp  // throttle cron připomínky; PATCH renewalAt ho maže
}
```

- **Správa domén** `/domains` (admin, member): všechny domény seřazené podle expirace, filtry (po expiraci, do 30 dnů, bez klienta), přiřazení klienta. Čte celou kolekci a řadí v paměti, bez indexu.
- **Připomínka obnovení:** odznak na detailu klienta (brzy/po expiraci), widget „Blížící se obnovení domén" na dashboardu, denní cron `/api/cron/domain-renewals` (notifikace adminům 30 dnů předem, throttle 7 dnů přes `renewalReminderSentAt`, přeskakuje `autoRenew`).
- **Zápis** jen přes Route Handlers s admin SDK (`/api/domains`), klientský SDK jen čte.

### `leads` (zrušeno 2026-09-30)
**Leady jsou z aplikace odstraněné** (UI, API, dashboard, hledání, archiv). Data v Firestore zůstávají jen ke čtení (rules: write false), nic je nemaže ani nepřevádí. Nahrazeno: poptávky z webu → `prospects` (source `web`), převod na klienta přímo z Oslovení. Historický tvar:

```ts
{
  name: string
  company?: string
  email?: string
  phone?: string
  source: 'web' | 'referral' | 'outreach' | 'event' | 'other'
  stage: 'new' | 'contacted' | 'demo' | 'offer' | 'contract' | 'onboarding' | 'won' | 'lost'
  value?: number             // očekávaná roční hodnota v CZK
  ownerUid: string           // kdo lead vede
  lostReason?: string
  notes?: string
}
```

(Dříve: stav `won` vytvořil klienta + onboarding úkoly. Úkoly zrušeny v 1.45.0.)

### `subscriptions`
Předplatné. Klient jich může mít **víc** (fáze 34C), např. vizitka + správa webu. Každé se fakturuje zvlášť (cron = 1 faktura na předplatné). Název do UI a faktur: `subscriptionLabel()` v `lib/plans.ts`. Ukončení: stav `cancelled` (zůstane v historii). Omylem založené předplatné bez faktur může admin trvale smazat (`DELETE /api/subscriptions/[id]`, zaloguje se u klienta); s fakturami jde jen zrušit. Akce na omezenou dobu: `discountUntil` (sleva platí pro období začínající nejpozději ten den; cron, předvyplnění faktury i upozornění v detailu klienta přes `lib/discount.ts`, období se 100% slevou cron přeskočí a posune).

```ts
{
  clientId: string
  service?: 'card' | 'web' | 'other'  // chybí = 'card' (stávající data)
  plan?: 'basic' | 'pro' | 'summit'  // jen vizitka (PLANS: Start 349 / Růst 549 / Náskok 749, jako web)
  label?: string             // vlastní název (web / jiné: povinný, např. „Správa webu")
  instanceId?: string        // volitelná vazba na vizitku / web
  priceMonthly: number       // CZK, VŽDY měsíční cena; roční fakturace = billedMonths(): vizitka 10 × (2 měsíce zdarma), web/jiné 12 ×
  billingCycle: 'monthly' | 'yearly'
  status: 'trial' | 'active' | 'past_due' | 'cancelled'
  internal?: boolean         // interní vizitka (obchodník/vlastní) — nefakturuje se a nepočítá do MRR
  discountPercent?: number   // sleva z předplatného (0–100), přenáší se do řádku faktury
  discountNote?: string      // důvod slevy
  discountUntil?: Timestamp | null  // poslední den akce (včetně), chybí = trvalá sleva; logika v lib/discount.ts
  startedAt: Timestamp
  nextInvoiceAt: Timestamp
}
```

### `invoices`
```ts
{
  clientId: string
  number: string             // RRRR-NNNN (vlastní blok od 7001), z counters/invoices; VS = číslo bez pomlčky
  amount: number             // CZK, součet řádků po slevě
  items?: {                  // řádky faktury (fáze 31B/E)
    description: string
    quantity: number
    unitPrice: number
    discountPercent?: number // sleva na řádku: 0/5/10/15/20/25/30 %
  }[]
  variableSymbol?: string
  subscriptionId?: string    // vazba na předplatné (cron generování)
  projectId?: string         // vystaveno ze zakázky (projects.invoiceId ukazuje zpět)
  note?: string
  issuedAt: Timestamp
  dueAt: Timestamp
  paidAt?: Timestamp
  sentAt?: Timestamp
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'   // 'sent' = vystaveno (v UI „Vystaveno“), neznamená odeslaný e-mail
}
```

PDF se generuje on-demand vlastním generátorem (`lib/pdf/invoice-pdf.tsx`, `GET /api/invoices/[id]/pdf`) — neukládá se. Stejný endpoint obsluhuje i klientskou zónu (spx-hub): s `Authorization: Bearer HUB_API_SECRET` + `X-Hub-Client-Id` vrátí jen vlastní fakturu klienta, ne koncept ani storno (`lib/hub.ts`). Historické faktury mohou mít reliktní pole `fakturoidId/fakturoidNumber/fakturoidStatus/pdfPath` (fáze 31, Fakturoid odstraněn ve fázi 32) — nová logika je nepoužívá.

### `costServices`
Placené služby pro provoz webů, vizitek a firmy (Vercel, Google Cloud, OpenAI, Claude, nástroje). Plán nákladů. Domény sem nepatří, jejich cena je u `domains.price`.

```ts
{
  name: string                // např. Vercel Pro
  vendor?: string             // dodavatel (Vercel, Google, OpenAI, Anthropic…)
  category: 'hosting' | 'cloud' | 'ai' | 'tools' | 'other'
  billing: 'monthly' | 'yearly' | 'usage' | 'once'  // usage = podle spotřeby, `amount` je odhad za měsíc; once = jednorázová platba v měsíci `startedAt`, mimo měsíční plán
  amount: number              // částka za periodu v `currency`
  currency: 'CZK' | 'USD' | 'EUR'
  nextPaymentAt?: Timestamp   // jen yearly: příští platba (měsíc výročí); zápis platby v tom měsíci ji posune o rok
  startedAt: Timestamp        // od kdy se platí (první měsíc v přehledu)
  endedAt?: Timestamp | null  // ukončeno (poslední měsíc v přehledu)
  note?: string
  createdAt, updatedAt: Timestamp
  createdBy: string
}
```

### `costPayments`
Skutečně zaplacená částka služby za měsíc. ID dokumentu `{serviceId}_{YYYY-MM}` (jedna platba na službu a měsíc, nový zápis přepíše).

```ts
{
  serviceId: string
  month: string               // 'YYYY-MM'
  amount: number              // v `currency`
  currency: 'CZK' | 'USD' | 'EUR'
  rate: number                // kurz ČNB (Kč za 1 jednotku) ke dni platby, CZK = 1
  amountCzk: number           // amount × rate, zaokrouhleno na Kč
  paidAt?: Timestamp
  note?: string
  createdAt, updatedAt: Timestamp
  createdBy: string
}
```

- **Přehled** `/costs` (admin, member): plán měsíčně a ročně (roční služby / 12, usage = odhad, domény = součet `domains.price` / 12), skutečnost za měsíc a 12 měsíců v grafu, porovnání s MRR (marže), blížící se roční platby služeb a obnovení domén (45 dnů).
- **Skutečnost za měsíc:** zapsaná platba; jinak pevná služba (monthly, yearly v měsíci výročí) počítá plán („dle plánu“); usage bez zápisu je „nezadáno“. Domény (klientů i naše) celou roční cenou v měsíci výročí `renewalAt`; bez ceny nebo data obnovení se nepočítají, domény archivovaných klientů taky ne.
- **Kurz:** ČNB denní kurz (`lib/cnb.ts`, cache 12 h), u platby ke dni `paidAt` (bez data poslední den měsíce, nejvýš dnes). Plán přepočítává aktuálním kurzem.
- Čte a zapisuje jen Admin SDK (`/api/costs/...`), rules žádný přístup.

### `tasks` (zrušeno)
Sekce Úkoly zrušena v 1.45.0, nahradil ji Backlog (`tickets`). CRM kolekci nečte ani nezapisuje, rules nic nepovolují (výchozí zákaz), indexy odebrány. Stará data v kolekci zůstala.

### `tickets`
V CRM sekce **Backlog** (`/backlog`, od 1.41.0, dřív Tickety): Kanban Úkoly, Zpracovává se, Code review, Čekání na klienta, Hotovo. Bugy, požadavky na změnu vizitky, zpětná vazba klientů a interní úkoly (bez klienta, změny v CRM, HUBu apod.). Od 1.39.0 je zakládají i klienti v HUBu (sekce **Zpětná vazba**, `source: 'hub'`): klient vidí jen svoje tickety z HUBu, jejich stav a vlákno zpráv. Tickety založené v CRM klient nevidí.

```ts
{
  clientId?: string          // chybí = interní ticket (zakládá jen tým, obchodník ho nevidí)
  instanceId?: string
  type: 'bug' | 'change_request' | 'idea' | 'feedback'   // idea = nápad, feedback = zpětná vazba
  title: string              // z HUBu: první řádek textu (max 80 znaků)
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'          // z HUBu vždy 'medium'
  status: 'open' | 'in_progress' | 'code_review' | 'waiting_client' | 'resolved' | 'closed'
                             // sloupce Backlogu: open = Úkoly, in_progress = Zpracovává se, code_review = Code review,
                             // waiting_client = Čekání na klienta,
                             // resolved = Hotovo; closed je starší „Uzavřený“, v CRM také Hotovo (nově se nenastavuje)
  assigneeUid?: string
  attachments: TicketFile[]  // přílohy k zadání (z HUBu fotky a PDF), starší tickety []
  links: string[]            // externí odkazy (např. fotky na Google Drive), validované jako URL
  prLinks?: string[]         // odkazy na pull requesty, přidávají se v detailu (od 1.41.0)
  source?: 'crm' | 'hub'     // chybí = crm
  createdBy: string          // uid autora (tým v CRM, hubový účet klienta)
  createdByEmail?: string    // jen z HUBu: e-mail hubového účtu (komu poslat odpověď)
  // Vlákno (jen tickety z HUBu):
  messageCount?: number
  lastMessageAt?: Timestamp
  lastMessageFrom?: 'client' | 'team'
  unreadByTeam?: boolean     // klient založil ticket nebo napsal, tým ticket od té doby neotevřel
  unreadByClient?: boolean   // tým odpověděl nebo změnil stav, klient od té doby ticket neotevřel
  clientNotified?: {         // poslední e-mail klientovi o stavu (tlačítko v detailu ticketu, od 1.40.0)
    status: 'waiting_client' | 'resolved'
    at: Timestamp
    byUid: string
  }
}

// TicketFile (přílohy ticketu i zpráv)
{
  name: string               // původní název souboru
  type: string               // MIME: image/* nebo application/pdf
  size: number               // bajty, max 10 MB
  path: string               // Storage: tickets/hub/{clientId}/{fileId}-{název}
  url: string                // stažení přes token (firebasestorage.googleapis.com …?alt=media&token=)
}
```

#### `tickets/{id}/messages` (podkolekce)
Vlákno mezi klientem (HUB) a týmem (CRM). Zapisují jen servery přes Admin SDK (hub `/api/feedback`, core `/api/tickets/[id]/messages`). Zpráva týmu pošle klientovi e-mail (z adresy odesílatele v profilu) a push (`hubNotifications.push.tickets`), jen když je u odpovědi zaškrtnuté „Poslat i e-mailem“ (výchozí). Zpráva klienta upozorní adminy (`notifications` + push).

```ts
{
  from: 'client' | 'team'
  authorUid: string
  authorName: string         // klient: jméno klienta, tým: displayName
  text: string               // max 4000 znaků
  attachments: TicketFile[]
  createdAt: Timestamp
}
```

**Stavy pro klienta (HUB):** `open` (Úkoly) → Víme o tom, `in_progress` a `code_review` → Děláme na tom, `waiting_client` → Čekáme na vás, `resolved` / `closed` → Hotovo. Změna stavu klientovi nic neposílá, jen ticket v HUBu označí jako nepřečtený. E-mail a push ke stavu `waiting_client` nebo `resolved` pošle tým ručně tlačítkem v detailu ticketu (`POST /api/tickets/[id]/notify`), čas a autor se uloží do `clientNotified`.

### `prospects`
Zásobník oslovení — kontakty z portálu poradců a poptávky z webu, vrstva PŘED klienty. V UI zobrazeno jako **„Oslovení"** (ne „Prospekti"). Smysl: koordinace více obchodníků, nikdo neosloví dvakrát téhož člověka.

```ts
{
  name: string
  company?: string
  email?: string
  phone?: string
  city?: string
  category?: string          // kategorie kontaktu (Řemeslník, Finanční poradce…) — viz `prospectCategories`
  portalUrl?: string         // odkaz na profil na portálu
  demoUrl?: string           // odkaz na demo vizitku (Vercel) pro tohoto prospekta
  status: 'new' | 'contacted' | 'responding' | 'not_interested' | 'unreachable' | 'converted'
  ownerUid?: string          // kdo si prospekta zabral (null = volný)
  claimedAt?: Timestamp
  lastTouchAt?: Timestamp    // poslední kontakt
  nextFollowUpAt?: Timestamp // připomínka do attention feedu
  leadId?: string            // historické: po konverzi na lead (leady zrušené)
  clientId?: string          // klient vytvořený z kontaktu (status converted = „Klient")
  source: 'import' | 'manual' | 'web'  // web = poptávka z /kontakt (POST /api/leads/intake)
  importBatchId?: string     // dávka CSV importu
  inquiry?: {                // jen source=web: obsah poptávky z formuláře (chybějící = null)
    industry, product, plan, teamType, teamSize, link, message,
    promoCode                // platný promo kód z `promoCodes` (od 1.28.0)
    note                     // poznámka klienta celá, bez řádku „Zdroj: …", který přidává web
  }
  attribution?: {            // jen source=web: odkud návštěvník přišel (chybějící = null)
    utmSource                // letak, banner…; „direct" = zdroj neznámý
    utmMedium, utmCampaign, utmContent,
    referrer                 // doména, když nepřišel přes UTM
    landingPage              // první stránka na webu
  }
  deletedAt?: Timestamp      // archivace (fáze 25), filtruje se ze všech pohledů
  deletedBy?: string
}
```

- **Zabírání:** volné (kdokoli ze sales si vezme volného prospekta), zápis `ownerUid` v transakci — brání souběhu.
- **Log kontaktů:** přes `activity` (entityType=`prospect`, kind=`call`/`email`/`note`) — kdo, kdy, kanál, výsledek.
- **Převod na klienta:** akce „Vytvořit klienta" na detailu otevře předvyplněný formulář klienta → `POST /api/clients` s `prospectId` → klient (`prospectId`, `salesOwnerUid` = vlastník kontaktu), kontakt `status=converted` + `clientId`.
- **Poptávky z webu:** `POST /api/leads/intake` (cesta zachovaná kvůli spx-web proxy) založí kontakt `source=web`, `status=new`, firma z formuláře jde do `company`, vlastník z env `LEADS_DEFAULT_OWNER_UID`; obsah poptávky se uloží strukturovaně do `inquiry` a zdroj návštěvy do `attribution` (a zároveň čitelně do aktivity kontaktu), notifikace `lead.web` (in-app + Web Push adminům, e-mail se neposílá) míří na detail a nese zdroj. Pohled „Poptávky z webu" (`/prospects?source=web`) načte všechny webové poptávky bez stránkování a počítá je podle `attribution.utmSource` a `utmCampaign`. Starší poptávky (před 1.14.0) mají obsah jen v aktivitě.
- **Kategorie:** `category` je název kategorie kontaktu (string) — zdroj hodnot je `prospectCategories` + výchozí konstanty. Lze filtrovat v seznamu, editovat na detailu (tab Informace i Oslovení) i ve formuláři.
- Viditelnost: všichni sales vidí všechno (transparentní koordinace).

### `promoCodes`
Promo kódy pro poptávkový formulář na webu (spx-web /kontakt). ID dokumentu = kód (velká písmena, A–Z, 0–9, pomlčka, 3–30 znaků). Spravuje admin v Nastavení → Promo kódy.

```ts
{
  code: string               // stejné jako ID dokumentu
  description: string | null // interní poznámka „co kód dává“, na web se neposílá
  validUntil: string         // poslední den platnosti YYYY-MM-DD (včetně), čas Europe/Prague
  maxUses: number | null     // null = bez omezení
  usedCount: number          // počet poptávek s kódem, zvyšuje intake v transakci
  active: boolean            // vypnutý kód neplatí; použitý kód nejde smazat, jen vypnout
  lastUsedAt: Timestamp | null
}
```

- **Ověření:** web volá `POST /api/promo-codes/validate` (tajemství `x-ingest-secret`) při vyplnění pole, bez započítání. `POST /api/leads/intake` kód znovu ověří a započítá ve stejné transakci, ve které zakládá kontakt; neplatný kód vrátí 422 `{ error: "promo_invalid", reason }` (`not_found | inactive | expired | exhausted`) a kontakt nevznikne.
- **Použití:** kontakty s `inquiry.promoCode == code` (seznam v detailu kódu).
- **QR kód (od 1.31.0):** v Nastavení → Promo kódy jde ke kódu zobrazit a stáhnout QR (SVG/PNG) s odkazem `https://www.solopixel.cz/cs/kontakt?promo=KOD&utm_source=qr#form` (`lib/promo-url.ts`); web kód z `?promo=` předvyplní a ověří. Nic se neukládá.
- **Rules:** `allow read, write: if false` (jen admin SDK).

### `prospectCategories`
Číselník kategorií kontaktů pro oslovení (Řemeslník, Realitní makléř, Finanční poradce, Obchodník, Osobnost…). Uživatelem vytvořené kategorie se ukládají sem; výchozí sada je definována konstantou v kódu a nabízí se vždy (i bez zápisu).

```ts
{
  name: string               // název kategorie (unikátní, case-insensitive)
}
```

- **API:** `GET /api/prospect-categories` vrací sjednocené (výchozí + uložené), deduplikované a seřazené; `POST` vytvoří novou (dedup case-insensitive, idempotentní).
- Na prospektu se ukládá jen `category` jako string (bez join) — číselník slouží jako řízený seznam a zdroj napovídání.

### `emailTemplates`
Vlastní HTML šablony pro **email marketing** (menu „Email marketing"). Na rozdíl od transakčních `templates/*` (jen předmět) jde o plnohodnotné HTML, které si admin/member vytváří a spravuje ručně. MVP: seznam + tvorba/editace přes HTML editor s živým náhledem.

```ts
{
  name: string               // interní název (v seznamu, ne v e-mailu)
  subject?: string           // předmět e-mailu
  html: string               // HTML šablony (max 200 000 znaků)
  deletedAt?: Timestamp      // rezervováno pro archivaci (MVP maže natvrdo)
}
```

- **API:** `GET/POST /api/email-templates`, `GET/PATCH/DELETE /api/email-templates/[id]` — vše přes Admin SDK, jen `admin`/`member`.
- **UI:** `/email-marketing` má taby **Přehled · Šablony · Seznamy**. Šablony: `/email-marketing/new` (tvorba), `/email-marketing/[id]` (editace), náhled = sandboxovaný `<iframe srcDoc>`.
- Zamýšlené rozšíření: kategorie/složky šablon, odesílání kampaní, proměnné/personalizace, statistiky.

### `marketingLists`
Marketingové seznamy kontaktů — pojmenované skupiny příjemců (odkazy na existující `prospects` a `clients`), komu se pošle zvolená šablona.

```ts
{
  name: string
  description?: string
  prospectIds: string[]      // členové z kolekce prospects
  clientIds: string[]        // členové z kolekce clients
  deletedAt?: Timestamp
}
```

- **API:** `GET/POST /api/marketing/lists`, `GET/PATCH/DELETE /api/marketing/lists/[id]` (PATCH mění název/popis i členy). `GET /api/marketing/contacts` vrací sjednocené kandidáty (prospekti + klienti: `{type,id,name,email,category}`). Vše Admin SDK, jen `admin`/`member`.
- **Kategorie:** segmentace přes `category` na kontaktu — sdílený číselník s oslovením (`prospectCategories`). Prospekti kategorii mají; u klientů je plánované doplnění.
- **UI:** tab „Seznamy" na `/email-marketing`; detail `/email-marketing/lists/[id]` (členové + picker prospektů/klientů s hledáním a filtrem kategorie).

### `campaigns` + `campaignEmails`
Marketingová kampaň = odeslání zvolené `emailTemplates` na zvolený `marketingLists`. Per příjemce vzniká záznam v `campaignEmails` (tracking přes Resend webhook, stejně jako `outreachEmails`).

```ts
// campaigns
{
  name: string
  templateId: string; templateName?: string
  listId: string; listName?: string
  subject?: string
  status: 'sending' | 'sent' | 'failed'
  totalRecipients: number; sentCount: number; failedCount: number
  sentAt?: Timestamp
}
// campaignEmails
{
  campaignId: string
  toEmail: string; contactType: 'prospect' | 'client'; contactId: string
  resendId: string; subject: string
  status: 'sent'|'delivered'|'opened'|'clicked'|'bounced'|'complained'|'failed'
  error?: string             // jen failed: důvod od Resendu (neodesláno)
  sentAt: Timestamp; lastEventAt: Timestamp|null
}
```

- **API:** `GET/POST /api/marketing/campaigns` (POST odešle — `testEmail` = jen test bez záznamu; jinak `templateId`+`listId` → rozešle všem příjemcům s e-mailem, dedup dle e-mailu, personalizace `{{jmeno}}`/`{{email}}`/`{{odkaz}}` — `{{odkaz}}` je v kampaních prázdné, plní se jen při odeslání jedné šablony z detailu klienta, viz `previewEmails`). `GET /api/marketing/campaigns/[id]` = detail + agregované statistiky + příjemci.
- **Statistiky:** webhook `/api/webhooks/resend` aktualizuje `campaignEmails.status` dle `resendId` (opened/clicked/…); přehled i detail počítají otevření/prokliky agregací z `campaignEmails` (bez čítačů).
- **UI:** tab „Kampaně" + `/email-marketing/campaigns/new` (výběr šablony+seznamu, náhled, test, odeslání) a `/email-marketing/campaigns/[id]` (statistiky + příjemci).
- Odesílá se přes **Resend batch API** (až 100 e-mailů jedním požadavkem, `sendBatchEmails` v `lib/email.ts`, logika v `lib/marketing/send-campaign.ts`). Dřív se posílalo po 15 souběžných požadavcích a Resend část odmítl kvůli limitu požadavků za sekundu (kampaň 6. 11. 2026: 7 ze 17 neodešlo, bez záznamu). Při odmítnutí kvůli limitu se čeká a zkouší znovu; neodeslaný e-mail dostane záznam `status: 'failed'` s důvodem.
- **Doposlat neodeslaným:** `POST /api/marketing/campaigns/[id]/resend` pošle aktuální šablonu lidem ze seznamu, kterým e-mail ještě neodešel (`failed` nebo bez záznamu); staré `failed` záznamy nahradí. Detail kampaně je vypíše s tlačítkem „Doposlat“.
- **Compliance/doručitelnost:** ke každému e-mailu se přidává **patička** (identifikace odesílatele z `settings/company` + odhlašovací odkaz) a **plain-text** varianta (`lib/marketing/compose.ts`). Každý `campaignEmails` má per-příjemce `unsubToken`; odkaz vede na veřejnou stránku `/unsubscribe/[token]` (potvrzení POSTem, ne GET — kvůli e-mailovým skenerům).

### `marketingUnsubscribes`
Odhlášení z marketingu. Doc ID = e-mail malými písmeny. Odeslání kampaně tyto adresy přeskočí.

```ts
{
  email: string
  campaignId?: string; contactType?: string; contactId?: string
  unsubscribedAt: Timestamp
}
```

- **API:** veřejné `POST /api/marketing/unsubscribe` `{ token }` — dohledá e-mail podle `campaignEmails.unsubToken` a založí odhlášení. Veřejná stránka `/unsubscribe/[token]` (mimo `(app)`, bez auth).

### `activity`
Append-only log akcí (poznámka, změna stavu, e-mail, hovor). Zobrazuje se na detailu klienta/leadu.

```ts
{
  entityType: 'client' | 'lead' | 'ticket' | 'invoice' | 'prospect'
  entityId: string
  kind: 'note' | 'status_change' | 'call' | 'email' | 'system'
  text: string
  actorUid: string
}
```

### `card-tokens`
Tokeny pro onboarding formulář na webu. Dokument ID = nanoid token.

```ts
{
  email: string
  name: string
  clientId?: string        // vazba na klienta v CRM
  createdAt: Timestamp
  usedAt?: Timestamp       // kdy byl formulář odeslán
}
```

### `card-submissions`
Vyplněné podklady z webového formuláře. Dokument ID = token.

Nový web zapisuje **vnořený tvar** (`schemaVersion: 2`) — zdroj pravdy je kontrakt ve web zadání `spx-web/spec/assign/zadani-formular-prestavba.md`. Starší záznamy jsou ploché (bez `schemaVersion`) — CRM je čte zpětně kompatibilně přes `normalizeSubmission` (`lib/submission-view-model.ts`).

```ts
// v2 (aktuální)
{
  schemaVersion: 2
  token: string
  basic: {
    fullName: string
    ico?: string           // IČO — v CRM/AI se nikdy nevypisuje
    phone?: string
    email: string
    companyBrand?: string
    customDomain?: string
    hasDomain?: 'ano' | 'ne'  // 'ano' = adresa vlastní domény, 'ne' = přání jaká by měla být
    region?: string
  }
  social?: {
    youtube?: string
    instagram?: string
    tiktok?: string
    facebook?: string
    custom?: { nazev: string; odkaz: string }[]
  }
  services?: {
    whatIDo?: string
    topServices?: string
    mainAction?: 'zavolat' | 'poptavka' | 'termin' | 'jine'
    mainActionNote?: string
    pricing?: string       // orientační ceník „od" (v datech zatím vždy prázdné)
  }
  about?: { text?: string }
  pixela?: {
    tone?: 'profesionalni' | 'pratelska' | 'energicka' | 'humor'
    address?: 'vykani' | 'tykani'
    ownWords?: string
  }
  appearance?: { colors?: string; notes?: string }  // vzhled a poznámky (v datech zatím vždy prázdné)
  profileImageUrl?: string
  createdAt: Timestamp
  processedAt?: Timestamp
  processedBy?: string     // uid kdo zpracoval
  notifiedAt?: Timestamp   // interní e-mail upozornění odesláno (idempotence)
}
```

Zod: `cardSubmissionSchema` (v2) + `legacyCardSubmissionSchema` (staré ploché záznamy) v `lib/schemas/card-submission.ts`.

Upozornění na nový podklad: web po odeslání volá `POST /api/submissions/notify` (přes proxy `spx-web/pages/api/notify-submission.ts`, sdílené tajemství `SUBMISSION_NOTIFY_SECRET`) → CRM pošle e-mail na `hello@solopixel.cz` a nastaví `notifiedAt`.

<details><summary>Legacy tvar (bez <code>schemaVersion</code>)</summary>

```ts
{
  fullName: string
  email: string
  phone?: string
  companyId?: string       // IČO
  officeAddress?: string
  specialization?: string
  city?: string
  primaryLanguage?: string
  availableLanguages: string[]
  customDomain?: string
  reasons: string[]        // 3 důvody proč
  cnbExams: string[]
  bio?: string
  yearsOfExperience?: number
  clientCount?: number
  focusAreas: string[]
  clientTypes: string[]
  profileImageUrl?: string
  token: string
  createdAt: Timestamp
  processedAt?: Timestamp
  processedBy?: string
}
```
</details>

**Provizní systém zrušen (2026-10-30, 1.29.0).** Kolekce `commissions`, dokument `settings/commission` a pole `users.commissionRate` aplikace už nečte ani nezapisuje; stará data ve Firestore zůstala jen jako historie a rules k `commissions` nepouštějí klienta (výchozí zákaz).

### `settings/company`
Dodavatelské (fakturační) údaje — hlavička „dodavatel" na PDF faktuře, platební údaje a QR platba. Edituje admin v Nastavení → Fakturační údaje. Nahrazuje dřívější env `COMPANY_BANK_ACCOUNT`.

```ts
{
  name: string               // název dodavatele
  address: string            // adresa (víceřádkově)
  ico?: string
  dic?: string               // neplátce DPH → prázdné
  bankAccount: string        // 123456789/0300
  iban?: string              // pro QR platbu; když prázdné, dopočítá se z účtu
  email?: string
  phone?: string
  web?: string
  vatNote?: string           // default "Nejsem plátce DPH."
  invoiceFooter?: string     // volitelná patička dokladu
}
```

### `outreachEmails`
Odeslané oslovovací e-maily (Resend) — stav doručení přes webhooky. Pokrývá první oslovení i druhý (follow-up) e-mail; odlišeno polem `template`.

```ts
{
  prospectId: string
  toEmail: string
  senderUid: string
  resendId: string           // ID z Resend API — klíč pro webhook párování
  subject: string
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'
  template?: 'outreach' | 'followup'  // typ e-mailu; chybí = 'outreach' (historická data)
  sentAt: Timestamp
  lastEventAt?: Timestamp
}
```

Webhook `POST /api/webhooks/resend` (ověřeno signing secretem) aktualizuje `status` a zapisuje `activity` na prospekta (otevřel / kliknul / nedoručitelné) — společně pro oslovení i follow-up.

Akce na `POST /api/prospects/[id]`:
- `send_email` — první oslovení (`template: 'outreach'` implicitně), cooldown 7 dní.
- `send_followup_email` — druhý e-mail (`template: 'followup'`). Vyžaduje existující odeslané oslovení a min. 3denní odstup od posledního e-mailu.

### `deliveryEmails`
Odeslané e-maily s předáním hotové vizitky klientovi — stav doručení přes webhooky (stejný Resend webhook jako outreachEmails).

```ts
{
  clientId: string
  instanceId: string           // kterou vizitku jsme předali
  toEmail: string
  senderUid: string
  resendId: string             // ID z Resend API — klíč pro webhook párování
  subject: string
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'
  sentAt: Timestamp
  lastEventAt?: Timestamp
}
```

Webhook `POST /api/webhooks/resend` hledá `resendId` v `outreachEmails` i `deliveryEmails`. U delivery loguje aktivitu na klienta (otevřel vizitku / kliknul / nedoručitelné).

### `previewEmails`
Odeslané e-maily s **náhledem vizitky ke schválení** — z detailu klienta se pošle vybraná email-marketingová šablona (`emailTemplates`) s proměnným odkazem na náhled (Vercel preview). Stav doručení přes stejný Resend webhook. Na rozdíl od `deliveryEmails` (předání hotové live vizitky) jde o fázi PŘED schválením; odkaz je pro každé odeslání jiný a nezveřejněný.

```ts
{
  clientId: string
  templateId: string           // která emailTemplates šablona
  templateName: string
  toEmail: string
  senderUid: string
  resendId: string             // ID z Resend API — klíč pro webhook párování
  subject: string
  odkaz?: string               // odkaz na náhled (nahradí {{odkaz}} v šabloně)
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'
  sentAt: Timestamp
  lastEventAt: Timestamp | null
}
```

- **Odeslání:** akce `send_marketing_email` na `POST /api/clients/[id]` `{ templateId, odkaz, greeting }`. Šablona se personalizuje `{{jmeno}}`/`{{email}}`/`{{odkaz}}` a posílá se **transakčně** (`sendTransactionalEmail`, plain-text přes `htmlToText`) — bez marketingové odhlašovací patičky (jde o 1:1 e-mail klientovi o jeho vlastní vizitce). Jen `admin`/`member`.
- **UI:** tlačítko „Poslat e-mail" v detailu klienta (`components/clients/marketing-email-dialog.tsx`) — výběr šablony, pole na odkaz (předvyplněné z `instance.deployUrl`), náhled v sandboxovaném `<iframe>`.
- Webhook `findEmailByResendId` hledá `resendId` i v `previewEmails`; eventy loguje aktivitu na klienta (otevřel náhled / kliknul / nedoručitelné).

### `invoiceEmails`
Odeslané faktury e-mailem klientovi — stav doručení přes stejný Resend webhook (fáze 31A). E-mail posílá CRM (ne Fakturoid), aby fungoval tracking otevření/kliknutí.

```ts
{
  invoiceId: string
  clientId: string
  toEmail: string
  senderUid: string
  resendId: string             // ID z Resend API — klíč pro webhook párování
  subject: string
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'
  sentAt: Timestamp
  lastEventAt?: Timestamp
}
```

Webhook `findEmailByResendId` hledá `resendId` i v `invoiceEmails`; eventy loguje aktivitu na fakturu (`entityType:"invoice"`) a na `opened` pošle notifikaci adminům.

### Hotové šablony (`templates/*-email`)
Registr v `lib/email-templates/system.ts`: tělo v kódu, v `templates/<docId>` jen předmět. Spravují se v Email marketing → Šablony (`/email-marketing/system/[key]`, jen admin), Nastavení je už nemá (`/settings/templates` přesměrovává). Šablony s `forClients` (Formulář podkladů, Připomenutí podkladů, Předání vizitky) jdou poslat klientovi přes Poslat e-mail ze šablony jako `templateId: "system:<key>"` s ručně vloženým odkazem; záznam jde do `previewEmails` jako u vlastních šablon.

### `templates/outreach-email`
Šablona oslovovacího e-mailu — `{ subject, body }` s placeholdery `{{jmeno}}` a `{{odkaz}}`. Edituje admin v Email marketing → Šablony → Hotové šablony.

### `templates/followup-email`
Šablona druhého (follow-up) e-mailu — `{ subject }` s placeholdery `{{jmeno}}` a `{{odkaz}}`. Edituje admin v Email marketing → Šablony → Hotové šablony.

### `templates/delivery-email`
Šablona e-mailu předání vizitky — `{ subject }` s placeholdery `{{jmeno}}` a `{{odkaz}}`. Edituje admin v Email marketing → Šablony → Hotové šablony.

### `templates/cardform-reminder-email`
Šablona připomenutí formuláře podkladů: `{ subject }` s placeholdery `{{jmeno}}` a `{{odkaz}}`. Edituje admin v Email marketing → Šablony → Hotové šablony. Odesílá se přes Poslat e-mail ze šablony (odkaz vložený ručně) nebo z formuláře podkladů u klienta tlačítkem Připomenout (`POST /api/card-tokens/[token]/remind`) se stejným nevyplněným odkazem; záznam jde do `cardFormEmails` s `kind: "reminder"`.

### `templates/onboarding` (zrušeno)
Šablona onboarding úkolů, zrušena s Úkoly v 1.45.0 (Nastavení → Onboarding odebráno). Dokument může v DB zůstat, nic ho nečte.

### `counters`
`counters/invoices` → `{ year: number, seq: number }`. Inkrement v transakci. `seq` je syrové pořadí (1, 2, …); číslo faktury = `RRRR-` + `(7000 + seq)` na 4 místa (`2026-7001`). Blok (7000) je v `lib/invoice-number.ts` (`INVOICE_NUMBER_BLOCK_START`).

### `hubLoginCodes` (spx-hub)
Jednorázové 6místné kódy pro přihlášení do klientské zóny (vedle magic linku; hlavně aplikace na ploše iPhonu). Zapisuje a čte jen spx-hub přes Admin SDK, rules žádný přístup nepovolují (výchozí zákaz).

```ts
// hubLoginCodes/{sha256("email:" + email)}
{
  codeHash: string           // sha256("code:" + email + ":" + kód), kód se neukládá
  attempts: number           // chybné pokusy; po 5 se kód zahodí
  expiresAt: Timestamp       // platnost 15 min
  createdAt: Timestamp
}
```

### `hubProjects` (spx-hub)
Projekt referencí jedné vizitky, ID dokumentu = `advisorSlug`. Vzniká v hubu při prvním otevření Referencí klientem, který má zapnuté `clients.hubFeatures.references`. Vlastník a doména se tu **nevedou** — čtou se vždy z `instances` (jeden zdroj pravdy). Zapisuje a čte jen spx-hub přes Admin SDK.

```ts
// hubProjects/{advisorSlug}
{
  formToken: string          // 32 znaků base64url, tajná část URL veřejného formuláře /r/{formToken}
  active: boolean            // false = formulář i veřejné API nic nevrací
  profile: {                 // hlavička veřejného formuláře
    displayName: string
    title?: string           // profese, např. "Finanční poradce"
    photoUrl?: string        // jen https
    intro?: string
  }
  settings: {
    nameFormat: 'short' | 'full'   // zobrazení jména na vizitce ("Jana N." / celé)
    serviceTypes: string[]         // nabídka pole „Typ služby" ve formuláři
  }
  google?: {                 // Google místo poradce pro recenze na vizitce (od hubu 1.25.0)
    placeId: string          // Places API (New), např. "ChIJ…"
    name: string             // název místa z Googlu, jen pro kontrolu v nastavení
    address?: string
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### `hubReferences` (spx-hub)
Reference od zákazníků poradce z veřejného formuláře. Nic se nezveřejní samo — poradce (nebo admin) v hubu ručně zveřejní / skryje / smaže. Text se nikdy neupravuje. Zveřejněné reference čte vizitka (spx-dbc) přes veřejné API hubu podle slugu.

```ts
// hubReferences/{autoId}
{
  projectSlug: string        // = hubProjects/{advisorSlug}, určuje ho výhradně token formuláře
  source: 'form' | 'invite'  // pevná URL / osobní odkaz (hubInvites)
  inviteId?: string          // hubInvites/{token} u source 'invite'
  authorName: string         // celé jméno, jak ho zákazník napsal
  rating: 'excellent' | 'good' | 'poor'
  text: string               // max 1000 znaků
  location?: string
  serviceType?: string       // jen hodnota z hubProjects.settings.serviceTypes
  consent: { at: Timestamp; version: string }   // souhlas se zveřejněním (vč. celého jména)
  status: 'new' | 'published' | 'hidden'
  publishedAt?: Timestamp
  publishedBy?: string       // e-mail toho, kdo zveřejnil
  publishSource?: 'manual'   // později 'auto'
  reply?: {                  // odpověď poradce, jen jednou (spx-hub spec/zadani-reference-odpoved.md)
    text?: string            // 10–500 znaků; po smazání odpovědi pole chybí
    createdAt: Timestamp
    createdBy: string        // e-mail ze session (klient, nebo admin v náhledu); nikdy se nezveřejňuje
    createdByRole: 'client' | 'admin'
    deletedAt?: Timestamp    // smazaná odpověď: zámek zůstává, novou napsat nejde
    deletedBy?: string
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}
```
Dotazy jen `where projectSlug in [...]`, řazení v paměti → bez indexu.

**Odpověď poradce (`reply`)** je jednorázová: hub ji zapíše v transakci jen tam, kde pole `reply` ještě vůbec není. Smazání odstraní jen `text`, zámek zůstane. Veřejné API ji pošle jen u zveřejněné reference a jen jako `reply: { text, createdAt }`. Rules se nemění, kolekce je pro klientský SDK zakázaná celá.

**Recenze z Googlu se neukládají.** U projektu s `google.placeId` je veřejné API hubu (`/api/public/references/{slug}`) načte živě z Places API (New), drží je jen v cache Next.js (24 h) a vrací vedle referencí jako `google: { rating, count, url, reviews[] }`. Google vrací nejvýš 5 recenzí podle vlastního výběru, proto se nic neschvaluje; ve Firestore je jen `placeId`. Přihlášení k API: service account z GA4 (scope `cloud-platform`), případně `GOOGLE_PLACES_API_KEY`.

### `hubInvites` (spx-hub)
Žádosti o referenci e-mailem: poradce (nebo admin týmu) zadá zákazníka, ten dostane osobní jednorázový odkaz `/p/{token}`. Odkaz jde otevírat, dokud zákazník referenci neodešle; platnost 90 dní od odeslání (připomenutí prodlouží, nejvýš 1 rok od vytvoření). Jen Admin SDK (spx-hub).

```ts
// hubInvites/{token}         // 32 znaků base64url, tajná část URL
{
  projectSlug: string        // = hubProjects/{advisorSlug}
  name: string               // jméno zákazníka (předvyplní se ve formuláři)
  email: string              // e-mail zákazníka, normalizovaný; nikdy se nezveřejňuje
  status: 'draft' | 'sent' | 'opened' | 'submitted' | 'cancelled'   // 'expired' se počítá z expiresAt
  sendCount: number
  sentAt?: Timestamp
  openedAt?: Timestamp
  expiresAt?: Timestamp
  submittedAt?: Timestamp
  referenceId?: string       // hubReferences/{id} po odeslání
  createdBy: string          // e-mail poradce / admina
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### `hubAuditLog` (spx-hub)
Kdo, kdy a co udělal s referencemi a projekty referencí, a s checklistem Průvodce. Jen zápis přes Admin SDK.

```ts
// hubAuditLog/{autoId}
{
  projectSlug: string        // u akcí guide.* místo něj clientId (průvodce patří klientovi)
  clientId?: string          // jen guide.*
  task?: string              // guide.task_*: id úkolu
  source?: 'manual' | 'auto' // guide.task_*: ručně / automaticky podle akce v hubu
  level?: number             // guide.level: dosažená úroveň 1–3
  referenceId?: string
  action: 'reference.created' | 'reference.published' | 'reference.hidden' | 'reference.deleted'
        | 'reference.replied' | 'reference.replyDeleted'
        | 'project.created' | 'project.updated' | 'project.tokenRegenerated'
        | 'guide.task_done' | 'guide.task_undone' | 'guide.level'
  actorEmail?: string        // prázdné = zákazník přes veřejný formulář
  actorRole: 'admin' | 'client' | 'public' | 'script'
  at: Timestamp
}
```

### `hubGuide` (spx-hub)
Průvodce v hubu („Jak z vizitky vytěžit maximum“): herní checklist „Nastavte si vizitku“ (7 úkolů ve 3 úrovních) a počítadla, které části průvodce klient používá (hub nemá vlastní GA4). Jeden dokument na klienta. Zapisuje jen klient sám: ručně přes `POST /api/guide`, automaticky podle akcí v hubu (HUB z plochy, stažený QR kód, první žádost / odkaz na referenci, otevřené Statistiky). Demo účet ani admin v náhledu nic nezapisují. Jen Admin SDK, rules žádný přístup nepovolují (výchozí zákaz).

```ts
// hubGuide/{clientId}
{
  tasks?: Record<TaskId, {             // hotové úkoly; vrácení ručního úkolu pole smaže
    source: 'manual' | 'auto'          // ručně (Hotovo), nebo automaticky podle akce
    at: Timestamp
  }>
  level?: number                       // nejvyšší dosažená úroveň 1–3 (Nastaveno, Sdíleno, Naplno), neklesá
  levelAt?: Timestamp
  introSeenAt?: Timestamp              // uvítací okno viděno (jednou za život účtu, nepřepisuje se)
  counters?: {
    open?: number                       // otevření stránky Průvodce (guide_open)
    openFrom?: Record<'header' | 'bubble' | 'intro' | 'dashboard' | 'references' | 'stats', number>
    section?: Record<SectionId, number> // rozbalení sekce (guide_section_open)
    copy?: Record<TemplateId, number>   // zkopírování / sdílení šablony (guide_copy)
    check?: Record<TaskId, { manual?: number; auto?: number }>   // odškrtnutí úkolu (guide_check)
    level?: Record<'1' | '2' | '3', number>                     // dosažení úrovně (guide_level)
    intro?: { shown?: number; cta?: number; later?: number }    // uvítací okno (guide_intro_*)
  }
  lastOpenAt?: Timestamp
  updatedAt: Timestamp
  // checklist: pole z první verze průvodce (nenasazená), hub ho ignoruje
}
```
Id úkolů, sekcí a šablon jsou ve spx-hub v `lib/guide.ts` (např. `kontrola`, `qr`, `reference`, `po-schuzce`); server přijme jen známá id. Úkoly vázané na funkci (`reference` → Reference, `statistiky` → Statistiky) se klientovi bez funkce nepočítají do postupu.

### `hubNotifications` (spx-hub)
Notifikace v HUBu (zvoneček v hlavičce, stránka Notifikace). Samotné notifikace se neukládají, hub je skládá z `hubReferences`, `lectureRatings` a `invoices` (posledních 60 dní). Jeden dokument na klienta, zapisuje jen klient sám (admin v náhledu ani demo účet ne). Jen Admin SDK, rules nic nepovolují (výchozí zákaz).

```ts
// hubNotifications/{clientId}
{
  seenAt?: Timestamp         // klient naposledy otevřel zvoneček; novější události = nepřečtené
  push?: {                   // co posílat do zařízení; chybí = zapnuto
    reference?: boolean      // nová reference
    lecture?: boolean        // zpětná vazba z přednášky (nejvýš 1× za hodinu na akci, `lectures.pushAt`)
    invoice?: boolean        // vystavená a uhrazená faktura (posílá spx-core, lib/hub-push.ts)
    tickets?: boolean        // odpověď a změna stavu u Zpětné vazby (posílá spx-core, lib/hub-push.ts)
  }
}
```

### `hubPushSubscriptions` (spx-hub)
Zařízení, kde si klient zapnul notifikace (Web Push). ID = sha256(endpoint).slice(0, 40). Zapisuje a maže hub (stránka Notifikace), spx-core z ní jen čte při faktuře a maže zaniklé odběry (404/410). Klíče VAPID sdílí hub i core (stejné jako u týmových notifikací v `users/{uid}/pushSubscriptions`). Jen Admin SDK.

```ts
// hubPushSubscriptions/{id}
{
  clientId: string
  uid: string                // hubový účet, který odběr zapnul
  endpoint: string           // https adresa push služby prohlížeče
  keys: { p256dh: string; auth: string }
  device: string             // „iPhone · Safari“ z User-Agent, pro seznam zařízení
  createdAt, updatedAt: Timestamp
}
```

### `lectures` (spx-hub)
Přednáška nebo akce lektora (tabule #25, hub `spec/hodnoceni-prednasek-progress.md`). Patří klientovi, ne vizitce. Jen spx-hub přes Admin SDK. Lektor ji v hubu naplánuje, nahraje materiály a na konci ukáže QR (`/h/{token}` → vizitka `?h={token}`). Na vizitce se bez QR nic neukazuje.

```ts
// lectures/{autoId}
{
  clientId: string
  title: string              // téma, max 120
  date: string               // yyyy-mm-dd; po dnešku = chystaná, jinak proběhlá
  place: string | null       // místo nebo akce
  notes: string | null       // soukromé poznámky k přípravě, ven nejdou
  token: string              // 16 znaků base64url, odkaz /h/{token} v hubu
  opensAt: Timestamp         // den akce 00:00 Europe/Prague
  closesAt: Timestamp        // 7. den 23:59:59 Europe/Prague (hodnotit jde 7 dní)
  materials: {               // max 10 souborů, Storage lectures/{clientId}/{id}/{materialId}-{název}
    id: string               // 12 hex znaků
    name: string             // původní název souboru
    type: string             // PDF, Office nebo obrázek
    size: number             // max 25 MB
    share: boolean           // poslat posluchačům (jinak jen podklad pro lektora)
    url: string              // odkaz ke stažení (Firebase download token)
    path: string
  }[]
  ratingsCount: number       // akci s hlasy nejde smazat
  pushAt?: Timestamp         // poslední notifikace lektorovi o hodnocení (nejvýš 1× za hodinu)
  createdAt, updatedAt: Timestamp
}
```

### `lectureRatings` (spx-hub)
Hlas posluchače z vizitky. ID = sha256(lectureId:email).slice(0, 28), když posluchač nechal e-mail (stejný e-mail podruhé neprojde), jinak automatické. Opakované hlasování z prohlížeče hlídá cookie `spx_lr_{token}`.

```ts
// lectureRatings/{id}
{
  lectureId: string
  clientId: string
  liked: boolean             // Líbila / Nelíbila
  takeaway: string           // „Co si z přednášky odnášíte?“, max 1000, bez odkazů a HTML, nepovinné
  email?: string             // jen kdo chtěl materiály (a akce nějaké k poslání má)
  consent?: { text: string; version: string; at: Timestamp }   // souhlas s posláním materiálů a kontaktem
  materialsSentAt?: Timestamp   // materiály odešly e-mailem (Resend)
  createdAt: Timestamp
}
```

Lektor vidí Líbila / Nelíbila, odpovědi a e-maily (export CSV); e-mail smí smazat (GDPR), hlas zůstane. Audit v `hubAuditLog` s `clientId` a `lectureId` (akce `lecture.*` a `rating.*`). Limity proti spamu v `hubRateLimits` pod klíčem `lecture-{lectureId}`.

## Security rules — principy

- Vše jen pro **tým** — helper `isTeam()` = přihlášený s claimem `role` v `admin | member | sales`. Firebase Auth je sdílený s klientskou zónou **spx-hub**: klientské účty mají claims `{ role: 'client', clientId }` a do SPX Core nesmí nic (ani rules, ani aplikace — `getCurrentUser()` vrací `null`, session cookie se pro ně nevytvoří). Účet bez role claimu nemá přístup nikam. Výjimky bez přihlášení: `card-tokens` (get, označení `usedAt`), `card-submissions` (create), Storage `cards/`. Do spx-hub se kromě klientů smí přihlásit i **admin týmu** (`role == 'admin'`, správa referencí všech vizitek); `member` a `sales` ne. Kolekce hubu (`hubLoginCodes`, `hubProjects`, `hubReferences`, `hubAuditLog`, `hubInvites`, `hubGuide`, `hubNotifications`, `hubPushSubscriptions`, `lectures`, `lectureRatings`) jsou pro klientský SDK zakázané.
- Zápis do `users` a mazání čehokoli jen `role == 'admin'` (z custom claims).
- `activity` je append-only (no update/delete).
- Klientský SDK zapisuje jen tam, kde je realtime UX (leads.stage, tickets); zbytek přes Route Handlers s admin SDK.

## Indexy

Composite indexy se přidávají průběžně dle dotazů (`firestore.indexes.json` v repu). Očekávané: `leads(stage, updatedAt)`, `tickets(status, priority)`, `invoices(status, dueAt)`.
