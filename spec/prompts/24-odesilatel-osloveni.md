# Fáze 25 — Odesílatel oslovovacích e-mailů (override jen pro admina)

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Datový model: `users.senderEmail`, `users.senderName` jsou už ve `spec/context/data-model.md`.

## Záměr

Oslovovací e-mail (fáze 14/22) už dnes odchází z e-mailu **přihlášeného uživatele** (`app/api/prospects/[id]/route.ts` → `senderEmail: user.email`, `senderName: displayName`). To je správně pro obchodníky (`jmeno@solopixel.cz`). Problém je jen admin účet `apps@solopixel.cz` — jako odesílatel vypadá špatně. Řešení: volitelný **override odesílatele** na uživateli, který smí nastavit **jen admin**.

## Zadání

### 1. Efektivní odesílatel

- V odeslání oslovení (`app/api/prospects/[id]/route.ts`) změnit zdroj z `user.email` / `displayName` na:
  - `senderEmail = userDoc.senderEmail ?? user.email`
  - `senderName = userDoc.senderName ?? displayName`
- Žádná změna chování pro uživatele bez override — pořád se posílá z jejich vlastní adresy/jména.

### 2. Validace odesílatele

- `senderEmail` musí být na **ověřené odesílací doméně** (`@solopixel.cz`). Při ukládání validovat (zod + server check); odmítnout cizí doménu se srozumitelnou hláškou — jinak Resend send selže.
- Konstanta povolené domény do `lib/email.ts` (např. `SENDER_DOMAIN = "solopixel.cz"`), ať je na jednom místě.

### 3. Editace — jen admin

- Správa uživatelů (`/nastaveni/uzivatele`): u každého uživatele přidat pole **„Odesílatel — e-mail"** a **„Odesílatel — jméno"** (volitelná, placeholder ukazuje default = login e-mail / displayName). Editovatelné **jen pro admina**.
- Route handler users PATCH: `senderEmail`/`senderName` přijímat jen když volající má roli admin (z payloadu od ne-admina ignorovat). Whitelist polí.
- V profilu (`/profil`) tato pole zobrazit **jen ke čtení** s poznámkou „Odesílatele nastavuje administrátor" — uživatel si je sám nemění (deliverability + kontrola).

### 4. Drobnost

- V dialogu „Odeslat oslovení" (náhled) zobrazit, z jaké adresy e-mail půjde („Odesláno z: …"), ať obchodník vidí finální odesílatele.

## Akceptační kritéria

- Bez override: e-mail odchází z e-mailu přihlášeného uživatele (beze změny).
- Admin nastaví u svého účtu (`apps@solopixel.cz`) `senderEmail = lukas.kaleta@solopixel.cz` + jméno → oslovení odeslané adminem chodí z této adresy.
- Ne-admin si odesílatele nezmění (UI read-only, API ignoruje); pole s cizí doménou je odmítnuto.
- Náhled ukazuje správnou adresu odesílatele.
- Lint + build čisté, ověření za admin i sales, work-log, stav fáze, commit (`feat: [changelog] override odesílatele oslovení pro admina`).
