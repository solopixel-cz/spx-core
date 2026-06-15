# Fáze 27 — Předání hotové vizitky klientovi (NÁVRH / ke schválení)

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec.
> Navazuje na fázi 14 (E-mailové oslovení) — znovu používá stejnou Resend infrastrukturu a webhook.
> **Tohle je zatím návrh k diskuzi.** Otevřené otázky níže (§ Otevřené otázky) je třeba rozhodnout před implementací.

## Záměr

Dnes CRM umí poslat prospektovi **demo** vizitku (akvizice). Chybí druhý konec procesu: když klient projde pipeline (lead → won → client) a my mu **postavíme ostrou vizitku** (instance na `{slug}.solopixel.cz`), je potřeba mu ji **předat přímo z CRM** — jedním klikem, brandovaným e-mailem s odkazem na jeho živou vizitku, se stejným trackingem (doručeno → otevřeno → kliknuto) jako u oslovení.

Cíl: „hotová vizitka projde celým procesem z CRM" = obchodník / account manager v detailu klienta klikne **„Předat vizitku klientovi"**, klient dostane e-mail „Vaše vizitka je hotová", otevření a proklik se zaznamenají, a v CRM je vidět, že předání proběhlo. Volitelně se tím instance překlopí na `live` a klient na `active`.

## Současný stav (na čem stavíme)

- **Outreach vzor** (`app/api/prospects/[id]/route.ts`, akce `send_email`): načte šablonu z `templates/outreach-email`, vyřeší odesílatele (`users.senderName/senderEmail` → fallback), vyrenderuje předmět + HTML (`lib/email-templates/outreach.ts`), odešle přes `sendOutreachEmail` (`lib/email.ts`), zapíše doc do `outreachEmails`, zaloguje aktivitu, posune stav prospekta.
- **Tracking**: `app/api/webhooks/resend/route.ts` (Svix podpis) přepisuje `outreachEmails.status` jen „nahoru" podle `statusOrder` (`lib/schemas/outreach-email.ts`) a loguje aktivitu (otevřel / kliknul / bounce).
- **Datový řetězec**: `client` (`email` povinný, `advisorSlug`, `status: onboarding|active|paused|churned`) → `instance` (`clientId`, `domain`, `status: setup|live|maintenance|offline`). Klient může mít víc instancí.

## Zadání

### 1. Datový model — záznam předání

Nová kolekce **`deliveryEmails`** (zrcadlo `outreachEmails`, ať webhook a UI sdílí logiku). `lib/schemas/delivery-email.ts`:

```ts
{
  ...baseFields,
  clientId: string,
  instanceId: string,      // kterou vizitku jsme předali
  toEmail: string,
  senderUid: string,
  resendId: string,        // párování s Resend webhookem
  subject: string,
  status: "sent"|"delivered"|"opened"|"clicked"|"bounced"|"complained",
  sentAt: Timestamp,
  lastEventAt?: Timestamp,
}
```

Status enum + `statusOrder` znovu použít z `outreach-email.ts` (vyextrahovat do sdíleného `lib/schemas/email-status.ts`, ať není duplicita).

> Pozn. k webhooku: Resend event nese jen `resendId`, ne kolekci. Webhook proto musí umět najít záznam v **`outreachEmails` i `deliveryEmails`**. Doporučení: sdílený helper `updateEmailStatusByResendId(resendId, event)`, který zkusí obě kolekce. (Alternativa v § Otevřené otázky — sjednotit do jedné kolekce `emails` s polem `type`.)

`firestore.rules` + indexy: doplnit `deliveryEmails` (čtení dle role jako u `outreachEmails`, zápis jen server/admin), index na `clientId` + `sentAt desc`. Nasadit přes `firebase deploy --only firestore`.

### 2. E-mailová šablona předání

- `templates/delivery-email` (Firestore doc) — editovatelný **předmět + tělo**, placeholdery `{{jmeno}}`, `{{odkaz}}` (= `https://{instance.domain}`), volitelně `{{domena}}`.
- `lib/email-templates/delivery.ts` — `renderDeliveryEmail({ jmeno, odkaz })` → `{ html, text }`, brandovaný stejně jako outreach, ale tón „Vaše vizitka je připravená / hotová". Tlačítko vede na živou vizitku.
- `DEFAULT_DELIVERY_SUBJECT` fallback (např. `"{{jmeno}}, vaše vizitka je hotová"`).
- Admin editace: **Nastavení → Šablona předání** (zrcadlo editoru šablony oslovení, vč. „Poslat testovací e-mail").

### 3. Endpoint — odeslání předání

`POST /api/clients/[id]` s `action: "send_card"` (zrcadlo prospekt `send_email`). Body: `greeting?`, `instanceId?`.

Flow (requireAuth):
1. Načíst klienta; musí mít `email`.
2. Vyřešit instanci: `body.instanceId`, nebo jediná instance klienta; když žádná → 400 „Klient nemá vizitku", když víc a `instanceId` chybí → 400 „Vyber kterou vizitku poslat".
3. `odkaz = https://{instance.domain}`.
4. Načíst subjekt z `templates/delivery-email`, vyřešit odesílatele (stejná logika jako outreach).
5. Vyrenderovat předmět + html/text, odeslat přes sdílený sender (viz § 5).
6. Zapsat doc do `deliveryEmails`.
7. `logActivity(entityType: "client", kind: "email", text: "Předána hotová vizitka na {email}")`.
8. **Volitelné překlopení stavů** (viz Otevřené otázky): instance `setup → live`, klient `onboarding → active`. Defaultně přes checkbox v dialogu, ne automaticky.

Bez 7denního cooldownu (transakční e-mail). Místo toho: u opětovného odeslání ukázat potvrzení („Vizitka už byla předána {datum}. Poslat znovu?").

### 4. UI — detail klienta

- Sekce **„Vizitka"** v detailu klienta: seznam instancí se stav-badge a prokliknutelným živým odkazem.
- Tlačítko **„Předat vizitku klientovi"** — aktivní když klient má `email` a existuje aspoň jedna instance; jinak tooltip s důvodem.
- Dialog s náhledem (vyrenderovaný předmět + tělo), editovatelné **„Oslovení"** (default křestní jméno, kvůli 5. pádu), výběr instance pokud je jich víc, odkaz needitovatelný (z `instance.domain`), volitelný checkbox „Označit vizitku jako live / klienta jako aktivního".
- Po odeslání: stav předání jako badge v logu aktivit klienta (odesláno → doručeno → otevřeno → kliknuto), stejně jako u oslovení.

### 5. Sdílení sender logiky

`sendOutreachEmail` v `lib/email.ts` je dnes vázaný na oslovení jen názvem — přejmenovat / zobecnit na `sendTransactionalEmail({ to, senderName, senderEmail, subject, html, text })` a `sendOutreachEmail` nechat jako tenký wrapper (zpětná kompatibilita). Předání použije stejnou funkci.

### 6. Webhook — rozšíření

`app/api/webhooks/resend/route.ts`: po ověření podpisu hledat `resendId` v `outreachEmails` **i** `deliveryEmails` (sdílený helper). Stejná logika „jen vyšší stav přepisuje". U `deliveryEmails`:
- `opened` / `clicked` → `logActivity` na klienta („Klient otevřel vizitku" / „Klient kliknul na vizitku ✨").
- `bounced` → aktivita + příznak (klient se nedá kontaktovat na daný e-mail); klientův stav neměnit automaticky.

### 7. Tracking / attention (volitelné, doporučené)

- `clicked` na předání → položka v attention feedu (`lib/attention.ts`) pro `salesOwnerUid` / account managera: „Klient si otevřel svou vizitku — ozvi se". Zmizí po zapsané aktivitě.

## Lifecycle „celého procesu" (cílový stav)

1. Lead won → klient `onboarding`, vygeneruje se slug.
2. Založí se instance (`setup`), postaví se vizitka.
3. **Předání**: „Předat vizitku klientovi" → e-mail s živým odkazem, tracking běží; volitelně instance → `live`.
4. Klient otevře / klikne (zaznamenáno), případně attention feed upozorní ownera.
5. (Volitelně, viz fáze 27b) klient přes potvrzovací odkaz vizitku **odsouhlasí** → klient → `active`.

## Otevřené otázky (rozhodnout před implementací)

1. **Auto-překlopení stavů.** Má odeslání předání automaticky nastavit instance `live` a klienta `active`, nebo to nechat na ručním checkboxu / úplně ručně? (Návrh: checkbox v dialogu, default zaškrtnuto „instance live", klient `active` ručně.)
2. **Akceptace klientem.** Stačí „předání = odeslání", nebo chceš i krok, kdy klient vizitku **odsouhlasí** (veřejná potvrzovací stránka → zápis do CRM → klient `active`)? To je samostatná fáze 27b (větší rozsah: public route, token).
3. **Víc instancí na klienta.** Potvrdit, že výběr instance v dialogu stačí (vs. předávat vždy „primární" instanci).
4. **Sjednocení e-mailů.** `deliveryEmails` jako nová kolekce (nižší riziko, navrženo výše), nebo zobecnit `outreachEmails` → `emails` s polem `type: outreach|delivery` (čistší, ale dotkne se stávajícího kódu a indexů)?
5. **Komu povolit předání.** Jen admin/member, nebo i sales u vlastních klientů? (Návrh: stejně jako kdo vidí/edituje klienta.)
6. **Obsah e-mailu.** Má předání kromě odkazu obsahovat i další kroky (jak vizitku sdílet, QR, přihlášení do něčeho)? Ovlivní šablonu.

## Akceptační kritéria

- V detailu klienta s instancí jde předat vizitku; e-mail dorazí s vyplněným oslovením a živým odkazem; vše se zapíše do logu aktivit klienta.
- Webhook eventy mění stav `deliveryEmails` (ověřit testem: otevřít, kliknout) a stav je vidět jako badge u záznamu.
- Bez instance / bez e-mailu je tlačítko neaktivní s vysvětlením; opětovné odeslání vyžaduje potvrzení.
- Webhook stále zpracovává oslovení i předání; bez platného podpisu vrací 401.
- Lint + build čisté, ověření v prohlížeči (i jako sales, je-li povoleno), work-log, stav fáze, commit (`feat: [changelog] předání hotové vizitky klientovi z CRM`).

## Manuální kroky (po implementaci)

1. V Nastavení → Šablona předání vyplnit text e-mailu.
2. Resend webhook už běží z fáze 14 — žádná nová DNS/konfigurace, jen redeploy CRM.
3. Nasadit `firestore.rules` + indexy (`firebase deploy --only firestore`).
