# Fáze 23 — Sjednocení domény na solopixel.cz

> Prompt pro Claude Code. Rozhodnutí: **hlavní doména = solopixel.cz**, `.eu` jen 301 přesměrování na `.cz`. Cílem je odstranit nekonzistenci (web byl dříve migrován na `.eu`, e-maily/demo/tracking zůstaly `.cz`). Tato fáze řeší CRM (spx-core) + e-mail; web se řeší zvlášť v repu solopixel-web (viz `spec/plans/sjednoceni-domeny-cz.md` tam).

## Cílový stav domén

| Co | Hlavní (cílově) |
|----|-----------------|
| Marketing web | `solopixel.cz` (`.eu` → 301) |
| CRM | `core.solopixel.cz` |
| Demo vizitka | `demo.solopixel.cz` (beze změny) |
| Formulář podkladů | `www.solopixel.cz/cs/vizitka-formular` |
| Odesílání e-mailů | `@solopixel.cz` (beze změny) |
| Tracking eventů | `links.solopixel.cz` (beze změny) |

## Zadání (spx-core)

### 1. Centrální konstanta domény
- `lib/siteUrl.ts` (nebo existující místo): `WEB_URL = "https://www.solopixel.cz"`, `DEMO_URL = "https://demo.solopixel.cz"`. Žádné `.eu` natvrdo v kódu.
- Env `NEXT_PUBLIC_CARD_FORM_BASE_URL` → `https://www.solopixel.cz/cs/vizitka-formular?token=` (změnit v `.env.example`, `.env.local` i ve Vercelu).

### 2. E-mailová šablona oslovení
- V `lib/email-templates/outreach.ts` a `spec/assets/osloveni-email.html`: odkazy logo/patička/UTM přepsat z `solopixel.eu` na `www.solopixel.cz`. Logo URL ověřit (veřejné).

### 3. Kontrola
- Grep celého repa na `solopixel.eu` — nahradit za `.cz` (kromě poznámek, že `.eu` je jen redirect). `demo.solopixel.cz` a `links.solopixel.cz` nechat.

## Manuální kroky (mimo kód — provedeš ty, připomenout na konci)

1. **Vercel (CRM projekt):** přidat doménu `core.solopixel.cz`, nastavit jako primární; `core.solopixel.eu` nechat jako redirect nebo odebrat. DNS u registrátora dle Vercel pokynů.
2. **Firebase Auth → Authorized domains:** přidat `core.solopixel.cz` (a `solopixel.cz`), aby fungovalo přihlášení.
3. **Resend → Webhooks:** změnit endpoint na `https://core.solopixel.cz/api/webhooks/resend` (signing secret zůstává; pokud se mění, zaktualizovat `RESEND_WEBHOOK_SECRET`).
4. **Vercel env** `NEXT_PUBLIC_CARD_FORM_BASE_URL` → `.cz` verze, **redeploy**.
5. Ověřit: přihlášení na `core.solopixel.cz`, odeslání oslovení, klik → log v CRM.

## Akceptační kritéria
- Nikde v CRM kódu ani e-mailu není `solopixel.eu` (kromě komentáře o redirectu).
- Formulářový odkaz, e-mail i CRM běží na `.cz`.
- Lint + build čisté, work-log, stav fáze, commit (`chore: [changelog] sjednocení domény na solopixel.cz`).
