# SPX Core — Datový model (Firestore)

Všechny entity mají `createdAt`, `updatedAt` (Timestamp) a `createdBy` (uid). Typy se definují zod schématy v `lib/schemas/` a odvozují přes `z.infer`.

**Mazání (od fáze 20):** archivovatelné entity (`clients`, `instances`, `leads`, `tickets`) mají volitelné `deletedAt` (Timestamp) a `deletedBy` (uid) — měkké smazání (archivace). Archivované záznamy se nezobrazují v běžných seznamech, vyhledávání ani součtech, ale data zůstávají kvůli historii. Jdou obnovit nebo (jen bez vazeb, jen admin) trvale smazat. **Faktury se nemažou — jen stornují** (status `cancelled`). `commissions`, `activity`, `outreachEmails` se nemažou samostatně (vážou se na jiné entity).

## Kolekce

### `users`
Členové týmu. Dokument ID = Firebase Auth UID.

```ts
{
  email: string
  displayName: string
  role: 'admin' | 'member' | 'sales'  // zrcadlí custom claim, claim je zdroj pravdy
  active: boolean
  commissionRate?: number    // osobní sazba provize (0–1); bez hodnoty platí default ze settings/commission
  photoURL?: string          // profilová fotka (Storage avatars/{uid}), zrcadlí se do Auth
  phone?: string
  senderEmail?: string       // override odesílatele oslovení (musí být na ověřené doméně); bez hodnoty = email. Mění jen admin.
  senderName?: string        // override jména odesílatele; bez hodnoty = displayName. Mění jen admin.
}
```

### `clients`
Klienti (finanční poradci).

```ts
{
  name: string               // jméno poradce
  company?: string
  ico?: string               // odběratel na faktuře
  dic?: string
  billingStreet?: string     // fakturační adresa (ulice a č.p.)
  billingZip?: string        // PSČ
  billingCity?: string       // město
  email: string
  phone?: string
  status: 'onboarding' | 'active' | 'paused' | 'churned'
  advisorSlug: string        // vazba na spx-dbc instanci
  salesOwnerUid?: string     // obchodní vlastník — kdokoli z týmu (i admin); plní se z leadu při výhře, mění jen admin/member. Provize vzniká jen vlastníkům s rolí sales.
  notes?: string
  leadId?: string            // odkud klient vznikl
}
```

### `instances`
DBC instance. Obvykle 1:1 ke klientovi, ale model umožňuje víc.

```ts
{
  clientId: string
  advisorSlug: string
  domain: string             // např. jmeno.solopixel.cz
  status: 'setup' | 'live' | 'maintenance' | 'offline'
  version: string            // verze spx-dbc
  repoUrl?: string
  deployUrl?: string
  features: string[]         // zapnuté moduly (kalkulačky, AI chat, …)
  notes?: string
}
```

### `leads`
Obchodní pipeline.

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

Stav `won` → vytvoří se `client` + onboarding úkoly ze šablony.

### `subscriptions`
Předplatné, 1:1 ke klientovi.

```ts
{
  clientId: string
  plan: 'basic' | 'standard' | 'premium'
  priceMonthly: number       // CZK
  billingCycle: 'monthly' | 'yearly'
  status: 'trial' | 'active' | 'past_due' | 'cancelled'
  startedAt: Timestamp
  nextInvoiceAt: Timestamp
}
```

### `invoices`
```ts
{
  clientId: string
  number: string             // RRRR-NNN, z counters/invoices
  amount: number             // CZK, součet řádků po slevě
  items?: {                  // řádky faktury (fáze 31B/E)
    description: string
    quantity: number
    unitPrice: number
    discountPercent?: number // sleva na řádku: 0/5/10/15/20/25/30 %
  }[]
  variableSymbol?: string
  subscriptionId?: string    // vazba na předplatné (cron generování)
  note?: string
  issuedAt: Timestamp
  dueAt: Timestamp
  paidAt?: Timestamp
  sentAt?: Timestamp
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  pdfPath?: string           // Storage cesta (nevyužito — PDF řeší Fakturoid)
  fakturoidId?: number       // ID dokladu ve Fakturoidu (fáze 31C)
  fakturoidNumber?: string
  fakturoidStatus?: string
}
```

### `tasks`
```ts
{
  title: string
  description?: string
  clientId?: string
  leadId?: string
  ticketId?: string          // úkol jako pracovní krok ticketu
  assigneeUid: string
  dueAt?: Timestamp
  status: 'open' | 'done'
  checklistTemplateId?: string  // pokud vznikl z onboarding šablony
}
```

### `tickets`
Bugy a požadavky na změnu vizitky.

```ts
{
  clientId: string
  instanceId?: string
  type: 'bug' | 'change_request'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed'
  assigneeUid?: string
  attachments: string[]      // Storage cesty
}
```

### `prospects`
Zásobník oslovení — kontakty z portálu poradců, vrstva PŘED leady. V UI zobrazeno jako **„Oslovení"** (ne „Prospekti"). Smysl: koordinace více obchodníků, nikdo neosloví dvakrát téhož člověka.

```ts
{
  name: string
  company?: string
  email?: string
  phone?: string
  city?: string
  portalUrl?: string         // odkaz na profil na portálu
  demoUrl?: string           // odkaz na demo vizitku (Vercel) pro tohoto prospekta
  status: 'new' | 'contacted' | 'responding' | 'not_interested' | 'unreachable' | 'converted'
  ownerUid?: string          // kdo si prospekta zabral (null = volný)
  claimedAt?: Timestamp
  lastTouchAt?: Timestamp    // poslední kontakt
  nextFollowUpAt?: Timestamp // připomínka do attention feedu
  leadId?: string            // po konverzi na lead
  source: 'import' | 'manual'
  importBatchId?: string     // dávka CSV importu
  deletedAt?: Timestamp      // archivace (fáze 25), filtruje se ze všech pohledů
  deletedBy?: string
}
```

- **Zabírání:** volné (kdokoli ze sales si vezme volného prospekta), zápis `ownerUid` v transakci — brání souběhu.
- **Log kontaktů:** přes `activity` (entityType=`prospect`, kind=`call`/`email`/`note`) — kdo, kdy, kanál, výsledek.
- **Konverze:** akce „Převést na lead" → vytvoří `lead` (source=`outreach`, ownerUid z prospekta), prospect.status=`converted` + `leadId`.
- Viditelnost: všichni sales vidí všechno (transparentní koordinace).

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
  }
  about?: { text?: string }
  pixela?: {
    tone?: 'profesionalni' | 'pratelska' | 'energicka' | 'humor'
    address?: 'vykani' | 'tykani'
    ownWords?: string
  }
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

### `commissions`
Provizní záznamy — vznikají automaticky při označení faktury jako zaplacené, pokud má klient `salesOwnerUid` s rolí sales. **Document ID = invoiceId** (idempotence — jedna faktura, jedna provize). Storno vyplacené faktury vytvoří záporný záznam s ID `{invoiceId}-reversal`.

```ts
{
  invoiceId: string
  clientId: string
  salesUid: string
  baseAmount: number         // zaplacená částka faktury (CZK), u storna záporná
  rate: number               // sazba v momentě vzniku (snapshot — pozdější změna sazby nemění historii)
  amount: number             // baseAmount * rate, zaokrouhleno na koruny
  status: 'pending' | 'paid' | 'reversed'
  earnedAt: Timestamp        // datum zaplacení faktury
  paidAt?: Timestamp         // datum vyplacení obchodníkovi
  payoutNote?: string        // např. číslo došlé faktury od obchodníka
}
```

Pravidla: provize doživotní (dokud klient platí); jen role sales; sazba = `users.commissionRate` ?? default ze `settings/commission`; změna `salesOwnerUid` ovlivní jen budoucí provize; bez vlastníka provize nevzniká (ani zpětně po přiřazení).

### `settings/commission`
`{ defaultRate: number }` — výchozí sazba (0.20). Edituje admin v Nastavení.

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

### `templates/outreach-email`
Šablona oslovovacího e-mailu — `{ subject, body }` s placeholdery `{{jmeno}}` a `{{odkaz}}`. Edituje admin v Nastavení.

### `templates/followup-email`
Šablona druhého (follow-up) e-mailu — `{ subject }` s placeholdery `{{jmeno}}` a `{{odkaz}}`. Edituje admin v Nastavení → Šablony → Follow-up.

### `templates/delivery-email`
Šablona e-mailu předání vizitky — `{ subject }` s placeholdery `{{jmeno}}` a `{{odkaz}}`. Edituje admin v Nastavení → Šablona předání.

### `templates/onboarding`
Šablony checklistů — pole kroků `{ title, offsetDays }`. Při výhře leadu se rozgenerují do `tasks`.

### `counters`
`counters/invoices` → `{ year: number, seq: number }`. Inkrement v transakci.

## Security rules — principy

- Vše jen pro přihlášené (`request.auth != null`).
- Zápis do `users` a mazání čehokoli jen `role == 'admin'` (z custom claims).
- `activity` je append-only (no update/delete).
- Klientský SDK zapisuje jen tam, kde je realtime UX (leads.stage, tickets, tasks.status); zbytek přes Route Handlers s admin SDK.

## Indexy

Composite indexy se přidávají průběžně dle dotazů (`firestore.indexes.json` v repu). Očekávané: `leads(stage, updatedAt)`, `tickets(status, priority)`, `invoices(status, dueAt)`, `tasks(assigneeUid, status, dueAt)`.
