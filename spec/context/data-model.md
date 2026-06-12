# SPX Core — Datový model (Firestore)

Všechny entity mají `createdAt`, `updatedAt` (Timestamp) a `createdBy` (uid). Typy se definují zod schématy v `lib/schemas/` a odvozují přes `z.infer`.

## Kolekce

### `users`
Členové týmu. Dokument ID = Firebase Auth UID.

```ts
{
  email: string
  displayName: string
  role: 'admin' | 'member'   // zrcadlí custom claim, claim je zdroj pravdy
  active: boolean
}
```

### `clients`
Klienti (finanční poradci).

```ts
{
  name: string               // jméno poradce
  company?: string
  email: string
  phone?: string
  status: 'onboarding' | 'active' | 'paused' | 'churned'
  advisorSlug: string        // vazba na spx-dbc instanci
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
  amount: number             // CZK
  issuedAt: Timestamp
  dueAt: Timestamp
  paidAt?: Timestamp
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  pdfPath?: string           // Storage cesta
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

### `activity`
Append-only log akcí (poznámka, změna stavu, e-mail, hovor). Zobrazuje se na detailu klienta/leadu.

```ts
{
  entityType: 'client' | 'lead' | 'ticket' | 'invoice'
  entityId: string
  kind: 'note' | 'status_change' | 'call' | 'email' | 'system'
  text: string
  actorUid: string
}
```

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
