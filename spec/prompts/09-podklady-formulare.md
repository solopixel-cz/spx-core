# Fáze 9 — Podklady z webového formuláře

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 7.

## Kontext

Na webu solopixel.cz běží `/vizitka-formular?token=XYZ` (repo solopixel-web, `pages/vizitka-formular/index.tsx`) — onboarding dotazník pro nové poradce. Funguje takto:

- Formulář ověří token čtením `card-tokens/{token}` (obsahuje `email`, `name` pro předvyplnění).
- Poradce vyplní profil a nahraje fotku do Storage `cards/{token}/profile.{ext}`.
- Odeslání zapíše `card-submissions/{token}` (klientský SDK, bez přihlášení): fullName, email, phone, companyId (IČO), officeAddress, specialization, city, primaryLanguage, availableLanguages[], customDomain, reasons[3], cnbExams[], bio, yearsOfExperience, clientCount, focusAreas[], clientTypes[], profileImageUrl, token, createdAt.

Tokeny se dosud vytvářely ručně ve Firebase konzoli. CRM je dosud nezná — a **rules ve spx-core tyto kolekce nepokrývají** (nasazení by formulář rozbilo).

## Zadání

### 1. Rules (PRIORITA — opravit jako první)

- `firestore.rules`:
  - `card-tokens/{token}`: `allow get: if true` (jen get, ne list — token je tajemství v URL), zápis deny (CRM píše admin SDK).
  - `card-submissions/{token}`: `allow create: if true`, read/update/delete deny (CRM čte admin SDK). Zvaž validaci create (povinná pole, rozumné limity délky stringů).
- `storage.rules`: `cards/{token}/{fileName}` — `allow write: if true` s limitem 5 MB a content-type `image/*`; read veřejný (URL fotky se používá na vizitce).
- Nasadit: `firebase deploy --only firestore,storage` a **ručně ověřit, že formulář na webu dál funguje** (validace tokenu, odeslání, upload fotky).

### 2. Datový model

- Do `spec/context/data-model.md` doplň kolekce `card-tokens` (email, name, clientId?, createdAt, usedAt?) a `card-submissions` (pole viz Kontext + `processedAt?`, `processedBy?`). Zod schémata do `lib/schemas/`.

### 3. Generování odkazu z detailu klienta

- Na detailu klienta (záložka Přehled) tlačítko **„Poslat formulář podkladů"** → route handler vytvoří `card-tokens/{nanoid}` s `clientId`, jménem a e-mailem klienta → dialog zobrazí URL `https://solopixel.cz/vizitka-formular?token=...` s tlačítkem kopírovat.
- Zápis do aktivity klienta („Vygenerován formulář podkladů").
- Pokud klient už má nevyužitý token, nabídni zkopírování existujícího místo vytváření nového.

### 4. Stránka Podklady (`/podklady`)

- Nová položka v sidebaru (ikona clipboard/inbox) mezi Klienti a Fakturace.
- Tabulka submissions: jméno, e-mail, klient (přes `card-tokens.clientId`; bez vazby zkusit match podle e-mailu na klienty, jinak „—"), datum odeslání, stav (Nové / Zpracované). Badge počtu nových v sidebaru.
- Detail v Sheet: všechna pole přehledně po sekcích (Kontakt, Profese, Profil, Vizitka), profilovka jako obrázek, odkaz na klienta.
- Akce **„Označit zpracované"** (`processedAt`, `processedBy` přes admin SDK) + zápis do aktivity klienta, pokud je navázán.
- Na detailu klienta (Přehled) karta „Podklady": stav formuláře (neodeslán / čeká na vyplnění / vyplněno dne X) s proklikem.

### 5. Dashboard

- Karta/řádek „Nevyřízené podklady" s počtem nových submissions a proklikem na `/podklady`.

## Akceptační kritéria

- Po nasazení rules webový formulář funguje beze změny (ověřit reálným testem: vygenerovat token z CRM, vyplnit, odeslat, fotka se nahraje).
- Z detailu klienta jde vygenerovat a zkopírovat odkaz; submission se ukáže v `/podklady` navázaná na klienta.
- Označení „zpracované" funguje a propíše se do aktivity klienta.
- Lint + build čisté, work-log, stav fáze, commit (`feat: [changelog] podklady z webového formuláře`).
