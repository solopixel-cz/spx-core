# Fáze 31 — Rozšíření fakturace (odeslání, PDF, Fakturoid, banka)

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 5 (Fakturace) a 16 (Provize). Datový model faktur (`invoices`, `subscriptions`, `commissions`) je ve `spec/context/data-model.md`.

## Záměr

Z minimální fakturace (dnes: klient + částka + splatnost, „zaplaceno" se kliká ručně) udělat provozně použitelný nástroj: vystavit fakturu klientovi, **odeslat mu ji e-mailem a sledovat doručení/otevření/kliknutí**, a **vidět, jestli zaplatil** — bez ručního hlídání účtu.

## Architektonické rozhodnutí (potvrzeno se zadavatelem)

- **Fakturoid = účetní pravda + generátor PDF + zdroj stavu platby.** CRM přes API zakládá faktury ve Fakturoidu; ten dělá oficiální doklad a — protože má napojenou **ČSOB** — hlásí zpět stav zaplacení. **Nestavíme vlastní PDF engine ani přímou bankovní integraci** (přímé ČSOB PSD2 API vyžaduje licencovaného TPP / firemní smlouvu + certifikát — mimo rozsah).
- **E-mail posílá CRM přes Resend** (ne Fakturoid), aby fungoval tracking doručeno/otevřeno/kliknuto přes už hotový `POST /api/webhooks/resend`. Až bude PDF z Fakturoidu (fáze C), přiloží se k tomuto e-mailu.
- Zadavatel je **neplátce DPH** → doklady bez DPH (jednodušší).
- CRM zůstává vrstva navrch: pipeline, **provize napojené na „paid"**, notifikace (fáze 30-notifikace už hotová), přehledy.

## Rozfázování

| Sub-fáze | Obsah | Závislost |
|---|---|---|
| **A** | Odeslání faktury e-mailem přes Resend + tracking (doručeno/otevřeno/kliknuto) | žádná (infra hotová) |
| **B** | Detail faktury `/fakturace/[id]`, stav `draft`, položky, variabilní symbol, vazba na předplatné | po A |
| **C** | Napojení Fakturoid API: založení faktury → PDF → webhook/polling na zaplacení → auto „paid" → provize | po B |
| **D** | Vercel Cron: opakované faktury z `subscriptions.nextInvoiceAt`, ukládání `overdue`, upomínky po splatnosti | po C |

---

## Fáze A — Odeslání faktury e-mailem + tracking (tato dávka)

### 1. Datový model — `invoiceEmails`

Nová kolekce, zrcadlí `deliveryEmails` (viz `spec/context/data-model.md`). Schéma `lib/schemas/invoice-email.ts`:

```ts
{
  invoiceId: string
  clientId: string
  toEmail: string
  senderUid: string
  resendId: string            // klíč pro webhook párování
  subject: string
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'
  sentAt: Timestamp
  lastEventAt?: Timestamp
}
```
Zapsat i do `spec/context/data-model.md` (sekce k e-mailovým kolekcím). Rules: read pro `isAuth()`, write jen admin SDK (jako outreach/delivery).

### 2. Odeslání — `POST /api/invoices/[id]/send`

- `requireRole("admin", "member")` (faktury jsou admin/member).
- Načíst fakturu + klienta. Klient musí mít e-mail → jinak 400 se srozumitelným důvodem. Faktura nesmí být `cancelled` → jinak 400.
- Sestavit e-mail (do doby fáze C **bez PDF**, údaje v těle): číslo faktury, částka, datum splatnosti, číslo účtu + variabilní symbol (VS zatím odvodit z čísla faktury — plná definice VS je fáze B). Bankovní údaje z `settings` (pokud nejsou, jasná chyba/placeholder).
- `sendTransactionalEmail(...)` → `resendId`.
- Zapsat doc do `invoiceEmails` (`status:"sent"`, `sentAt`).
- `logActivity({ entityType:"invoice", entityId, kind:"email", text:"Odeslána faktura klientovi", actorUid })`.
- Pokud je faktura `draft` → přepnout na `sent` + `sentAt`. (Dnes create rovnou dělá `sent`; přesto ošetřit.)
- **Opakované odeslání je povolené** (fakturu je legitimní poslat znovu) — žádný 7denní blok jako u oslovení. Volitelně vrátit info, že už byla odeslána.

### 3. Webhook — rozšířit `POST /api/webhooks/resend`

- Do `findEmailByResendId` (dnes hledá `outreachEmails` → `deliveryEmails` → `cardFormEmails`) přidat **`invoiceEmails`**.
- Nová větev logování: eventy na faktuře → `logActivity(entityType:"invoice")`: „Klient otevřel fakturu" / „Klient kliknul ve faktuře" / „Fakturu se nepodařilo doručit".
- Na `opened` (`statusChanged`) navíc `notify()` adminům — „Klient otevřel fakturu" (stejný vzor jako cardFormEmails).
- Zachovat only-upgrade logiku přes `statusOrder`.

### 4. UI

- `fakturace/page.tsx` (server): kromě faktur načíst i poslední `invoiceEmails` per faktura → mapa `invoiceId → { status, sentAt }`, předat do klientské komponenty.
- `components/invoices/invoices-page-client.tsx`:
  - Tlačítko **„Odeslat"** u faktury (stavy `draft`/`sent`/`overdue`; ne u `paid`/`cancelled`) → volá send endpoint → toast + refresh. Když už byla odeslána, popisek „Odeslat znovu".
  - Badge stavu e-mailu (odesláno → doručeno → otevřeno → kliknuto) — recyklovat `outreachEmailStatus` z `lib/status.ts` + `components/status-badge.tsx`.
- Klik na fakturu zatím detail nemá (přijde ve fázi B) — badge a akce stačí v seznamu.

### Manuální kroky
Žádné nové — Resend doména i webhook jsou z fáze 14 nastavené. (VAPID/notifikace z fáze 30 už také běží.)

### Akceptační kritéria (Fáze A)
- Odeslání faktury z přehledu projde, e-mail dorazí s údaji faktury; vytvoří se `invoiceEmails` doc a aktivita na faktuře.
- Webhook eventy mění stav (test: otevřít/kliknout) a badge v seznamu se aktualizuje; „otevřel fakturu" přijde jako notifikace adminům.
- Odeslání bez e-mailu klienta / u stornované faktury je zablokované se srozumitelnou hláškou.
- Webhook bez platného podpisu vrací 401 (beze změny).
- Lint + build čisté, ověření v prohlížeči, work-log, stav fáze v `index.md`, commit (`feat: [changelog] odeslání faktury e-mailem + tracking doručení`).

---

## Fáze B–D (osnova, detail se doplní před realizací)

- **B:** `invoiceSchema` rozšířit o `items[]` (popis, množství, cena), `variableSymbol`, `subscriptionId?`, `sentAt`, snapshot odběratele. Route na editaci + `draft`. Stránka `/fakturace/[id]` (přehled, položky, historie e-mailů, akce).
- **C:** `lib/fakturoid.ts` (OAuth2/token, slug z env `FAKTUROID_*`). Při vystavení: založit fakturu ve Fakturoidu → uložit `fakturoidId` + PDF (příloha do e-mailu z fáze A). Webhook/poller na `invoice paid` → CRM `status:"paid"` + `paidAt` → `createCommissionIfNeeded`. Manuální kroky: Fakturoid API klíč + potvrdit ČSOB napojenou v tom účtu.
- **D:** `vercel.json` cron (denní): generovat faktury z `subscriptions.nextInvoiceAt` (posun `nextInvoiceAt`), materializovat `overdue` do DB, upomínky po splatnosti. Route `POST /api/cron/*` chráněná `CRON_SECRET`.
