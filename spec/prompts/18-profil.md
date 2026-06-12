# Fáze 18 — Profil uživatele

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Datový model: `users.photoURL`, `users.phone` už jsou ve `spec/context/data-model.md`.

## Záměr

Samostatná stránka `/profil` se záložkami, kde si každý uživatel (všechny role) spravuje vlastní účet: jméno, profilovou fotku, telefon, heslo a preference. Změna hesla se přesouvá z dialogu v avatar menu sem.

## Zadání

### 1. Stránka `/profil` (všechny role)

- Vstup: avatar menu v topbaru → položka „Můj profil" (nahrazuje „Změnit heslo"). PageHeader se jménem a rolí.
- Záložky (shadcn Tabs): **Profil**, **Zabezpečení**, **Preference**.

### 2. Záložka Profil

- **Profilová fotka:** kruhový náhled (aktuální fotka / iniciály), upload — obrázek max 2 MB, client-side zmenšení na 256×256 (canvas, center-crop na čtverec) → Storage `avatars/{uid}.jpg` → `photoURL` do `users` dokumentu i Firebase Auth profilu (`updateProfile`). Tlačítko „Odebrat fotku".
- **Jméno** (displayName) — react-hook-form + zod, min. 2 znaky; propsat do `users` i Auth. Pozn.: jméno se zobrazuje v aktivitě a u vlastnictví — změna se projeví u nových záznamů, historické texty se nepřepisují.
- **Telefon** (volitelný).
- **E-mail** — jen ke čtení s poznámkou „E-mail mění administrátor" (změna e-mailu v Auth vyžaduje re-verifikaci, mimo rozsah).
- **Role a sazba provize** (u sales) — jen ke čtení, pro informaci.
- Mutace přes route handler `PATCH /api/me` (jen vlastní dokument, whitelist polí: displayName, phone, photoURL — nic jiného z payloadu nepřijímat).

### 3. Záložka Zabezpečení

- Přesun stávající změny hesla (reauthenticate + updatePassword) z dialogu sem jako formulář.
- Informace o účtu: datum vytvoření, poslední přihlášení (z Auth metadata).

### 4. Záložka Preference

- **Vzhled:** výběr Světlý / Tmavý / Podle systému (napojit na next-themes, dnes je v topbaru jen toggle — toggle v topbaru zachovat).
- **Výchozí stránka po přihlášení:** select (Dashboard / Leady / Klienti / Prospekti…) — uložit do localStorage, login redirect ji respektuje.

### 5. Avatary napříč aplikací

- Sdílená komponenta `UserAvatar` (fotka → fallback iniciály s barvou dle uid) a použít ji všude, kde se dnes zobrazují iniciály: topbar, aktivita (dashboard i /aktivita), vlastník u klientů/leadů/prospektů, správa uživatelů, provize.

### 6. Storage rules

- `avatars/{uid}.jpg`: write jen `request.auth.uid == uid`, max 2 MB, `image/*`; read pro přihlášené. Nasadit `firebase deploy --only storage` (ověřit `Deploying to 'markly-1bd84'`).

## Akceptační kritéria

- Uživatel (i sales) si změní jméno, fotku a telefon; fotka se ihned ukáže v topbaru i v aktivitě; jiný uživatel ji po reloadu vidí taky.
- `PATCH /api/me` s cizími poli (role, commissionRate, email) je ignoruje/odmítne — ověřit přímým voláním.
- Upload 5 MB souboru nebo ne-obrázku je odmítnut srozumitelnou hláškou; Storage rules blokují zápis do cizího `avatars/{uid}` (ověřit).
- Změna hesla funguje z nové záložky; stará položka v avatar menu vede na `/profil`.
- Přepínání vzhledu a výchozí stránky funguje a přežije reload.
- Lint + build čisté, ověření za admin i sales, work-log, stav fáze, commit (`feat: [changelog] profil uživatele s fotkou a preferencemi`).
