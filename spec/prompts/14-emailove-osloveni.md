# Fáze 14 — E-mailové oslovení (Resend)

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 13 (Prospekti). Datový model (`prospects.demoUrl`, `outreachEmails`, `templates/outreach-email`) je už ve `spec/context/data-model.md`.

## Záměr

Obchodník pošle prospektovi předgenerovaný e-mail s odkazem na demo vizitku — přímo z CRM, jedním klikem, s náhledem. Mění se jen oslovení a odkaz, šablona je jednotná. Odeslání se zapíše do logu kontaktů; webhooky z Resend pak doplní „otevřel / kliknul" — nejcennější signál pro follow-up.

## Zadání

### 1. Resend integrace

- `npm i resend`. Env: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` (doplnit do `.env.example`).
- `lib/email.ts` — `sendOutreachEmail()`: odesílá přes Resend, from = `"{displayName} <{email přihlášeného uživatele}>"`, reply-to stejné. Uživatelé mají adresy na ověřené doméně solopixel.cz.

### 2. Pole demo vizitky

- `demoUrl` u prospekta: do formuláře (ruční přidání i editace) a do mapování CSV importu.
- V tabulce prospektů ikonka s proklikem, pokud je vyplněno.

### 3. Šablona (Nastavení → Šablona oslovení, admin)

- Editor: předmět + tělo (plain text s jednoduchými odstavci → render do minimalistického HTML), placeholdery `{{jmeno}}` a `{{odkaz}}` s nápovědou.
- Tlačítko „Poslat testovací e-mail" (na adresu přihlášeného).
- Výchozí obsah šablony nech prázdný s placeholderovou nápovědou — texty si napíše uživatel.
- Pozn. compliance (B2B oslovení): šablona má obsahovat plný podpis s identifikací firmy; do patičky výchozí věta s možností odmítnout další kontakt. Žádný skrytý tracking pixel navíc — open tracking řeší Resend.

### 4. Odeslání z prospekta

- Detail prospekta: tlačítko **„Odeslat oslovení"** — aktivní jen když má prospekt e-mail i `demoUrl`; jinak tooltip s důvodem.
- Dialog s náhledem: vyrenderovaný předmět i tělo. Pole **„Oslovení"** editovatelné (default křestní jméno) — kvůli 5. pádu („Jane", „Honzo") ho obchodník může upravit před odesláním. Odkaz needitovatelný (z `demoUrl`).
- Odeslat → route handler (requireAuth): Resend send → doc v `outreachEmails` → `logActivity` (kind=email, „Odesláno oslovení") → prospect: `status='contacted'` (pokud `new`), `lastTouchAt`, `nextFollowUpAt` = +3 pracovní dny (pokud není nastaven).
- Ochrana: stejnému prospektovi max 1 oslovení / 7 dní (kontrola v handleru, srozumitelná chyba).

### 5. Webhook `/api/webhooks/resend`

- POST handler s ověřením podpisu (`RESEND_WEBHOOK_SECRET`, svix hlavičky). Bez platného podpisu 401.
- Eventy: `delivered`, `opened`, `clicked`, `bounced`, `complained` → update `outreachEmails.status` (jen „vyšší" stav přepisuje nižší) + `lastEventAt`.
- Na `opened` / `clicked` / `bounced` zapsat `activity` na prospekta („Otevřel e-mail", „Kliknul na demo ✨", „E-mail se nepodařilo doručit").
- `clicked` → attention feed (`lib/attention.ts`): položka „Kliknul na demo — zavolej" pro vlastníka prospekta (zmizí po dalším zapsaném kontaktu).
- `bounced` → prospect.status = `unreachable`, pokud nemá jiný kontakt.

### 6. Viditelnost stavu

- V logu kontaktů prospekta ukázat stav e-mailu (odesláno → doručeno → otevřeno → kliknuto) jako badge u záznamu.
- V tabulce prospektů sloupec/ikona posledního e-mail stavu (kliknul = zvýrazněně).

## Manuální kroky (provede uživatel — připomenout na konci)

1. Resend: ověřit doménu `solopixel.cz` (DKIM/SPF DNS záznamy) — bez toho odesílání nepojede.
2. Resend: vytvořit API klíč → `RESEND_API_KEY` do Vercel env (CRM) + `.env.local`.
3. Resend: nastavit webhook na `https://<crm-domena>/api/webhooks/resend`, zkopírovat signing secret → `RESEND_WEBHOOK_SECRET`.
4. Redeploy CRM.

## Akceptační kritéria

- Odeslání z detailu prospekta projde, e-mail dorazí s vyplněným oslovením a odkazem, vše se zapíše do logu a stav prospekta se změní.
- Webhook eventy mění stav (ověřit testovacím e-mailem: otevřít, kliknout) a „kliknul" se objeví ve feedu vlastníka.
- Opakované odeslání do 7 dnů je zablokované; bez `demoUrl` je tlačítko neaktivní s vysvětlením.
- Webhook bez platného podpisu vrací 401.
- Lint + build čisté, ověření v prohlížeči (i jako sales), work-log, stav fáze, commit (`feat: [changelog] e-mailové oslovení prospektů přes Resend`).
