# Fáze 7 — Doplňky a dotažení

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 6 — dotahuje akceptační kritéria, která se do fází 4 a 6 nedostala.

## Zadání

### 1. Realtime aktualizace

- **Kanban leadů** (`/leady`): nahraď statické načtení `onSnapshot` listenerem nad `leads` (stage != won/lost). Změna fáze od kolegy se projeví živě, bez reloadu. Optimistický drag & drop zachovej.
- **Tickety** (`/tickety`): realtime listener na seznamu — změny stavů jsou vidět živě.
- Vzor: hook `useCollection<T>(query)` v `lib/hooks/` (typovaný přes zod schémata), unsubscribe v cleanup, loading + error stav.
- Ověř, že Firestore rules čtení pro přihlášené tyto listenery pokrývají.

### 2. Přílohy ticketů (Storage upload)

- Dialog nového ticketu + detail ticketu: upload příloh (obrázky/PDF, max 10 MB/soubor, max 5 souborů) do `tickets/{ticketId}/` přes klientský SDK.
- Náhled/odkaz ke stažení v detailu ticketu (signed URL nebo `getDownloadURL`).
- `storage.rules`: zápis jen přihlášení, jen do `tickets/**`, limit velikosti a content-type (image/*, application/pdf). Nasadit přes `firebase deploy --only storage`.

### 3. Globální vyhledávání (cmd+K)

- Aktivuj placeholder z topbaru: shadcn Command dialog (cmd+K / ctrl+K).
- Prohledává klienty, leady a tickety podle jména/titulu (klientsky — načti přes API endpoint `GET /api/search?q=`, který dotáhne kolekce admin SDK; objem dat je malý, fulltext netřeba).
- Výsledky seskupené podle entity, enter naviguje na detail.

### 4. Vazba úkolů na ticket

- `tasks.ticketId` (volitelné, už v `spec/context/data-model.md` a zod schématu — doplň do schématu, pokud chybí).
- Detail ticketu (Sheet): sekce **Úkoly** — seznam úkolů ticketu (titul, řešitel, termín, checkbox) + tlačítko „Přidat úkol" (předvyplní clientId i ticketId).
- Dialog úkolu na `/ukoly`: volitelný select ticketu (filtrovaný dle vybraného klienta).
- V seznamu úkolů ukaž odznak/odkaz na ticket, pokud existuje.
- Index `tasks(ticketId, status)` pokud bude dotaz potřebovat.

### 5. Správa hesel

- **Změna vlastního hesla:** položka „Změnit heslo" v avatar menu → dialog (současné heslo, nové heslo 2×, zod validace min. 8 znaků). Klientský SDK: `reauthenticateWithCredential` (EmailAuthProvider) → `updatePassword`. České chybové hlášky (špatné současné heslo, slabé heslo).
- **Reset adminem:** ve správě uživatelů (`/nastaveni/uzivatele`) akce „Resetovat heslo" → route handler s `requireRole('admin')`, admin SDK `updateUser(uid, { password })` s vygenerovaným dočasným heslem, zobrazit ho adminovi jednorázově v dialogu.
- **Zapomenuté heslo:** odkaz na login stránce → dialog s e-mailem → `sendPasswordResetEmail`. Vždy ukázat neutrální potvrzení („Pokud účet existuje, poslali jsme e-mail") — nezveřejňovat existenci účtu.

### 6. Drobnosti

- Filtry na `/tickety` rozšiř dle promptu fáze 6: typ, priorita, klient (teď je jen stav).
- Zkontroluj, že všechny mutace volají `logActivity()` (namátkou: tickets, tasks, invoices).

## Akceptační kritéria

- Změna fáze leadu / stavu ticketu je vidět ve druhém okně prohlížeče bez reloadu.
- Ticket s přílohou: upload, zobrazení, stažení funguje; storage.rules nasazené.
- Cmd+K najde klienta, lead i ticket a naviguje na ně.
- Z detailu ticketu lze založit úkol s předvyplněnou vazbou; úkol ukazuje odkaz na ticket.
- Změna vlastního hesla, admin reset i zapomenuté heslo fungují (ověřit ručně).
- Lint + build čisté, ověření v prohlížeči, work-log, stav fáze, commit (`feat: [changelog] realtime, přílohy ticketů a globální vyhledávání`).
