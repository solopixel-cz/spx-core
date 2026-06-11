# Fáze 2 — Auth a role

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 1.

## Zadání

Implementuj přihlášení přes Firebase Auth s rolemi admin/member přes custom claims. Registrace je uzavřená — uživatele zakládá admin.

### 1. Přihlášení

- `app/(auth)/login/page.tsx` — e-mail + heslo, react-hook-form + zod, chybové stavy česky.
- Session: po klientském signIn pošli ID token na `POST /api/auth/session` → admin SDK vytvoří **session cookie** (httpOnly, secure). Odhlášení = smazání cookie + klientský signOut.
- `lib/auth.ts` — `getCurrentUser()` pro Server Components (ověří session cookie, vrátí uid + claims).

### 2. Ochrana rout

- `app/(app)/layout.tsx` — bez platné session redirect na `/login`.
- Middleware jen na přesměrování (cookie existence check), tvrdé ověření v layoutu/handlerech přes admin SDK.

### 3. Role

- Custom claim `role: 'admin' | 'member'`. Helper `requireRole('admin')` pro route handlers.
- Bootstrap skript `scripts/create-admin.ts` (tsx) — založí prvního admina (email+heslo z argumentů) do Auth i `users` kolekce, nastaví claim. Funguje proti emulátoru i produkci dle env.

### 4. Správa uživatelů (Nastavení)

- `app/(app)/nastaveni/uzivatele/` — jen pro adminy: tabulka uživatelů, dialog „Přidat uživatele" (email, jméno, role → vytvoří Auth účet s dočasným heslem přes admin SDK), deaktivace, změna role.
- Avatar menu v topbaru: jméno přihlášeného, odhlásit.

### 5. Firestore rules

- Nahraď deny-all: čtení pro přihlášené, `users` zápis jen admin (claim check). Ostatní kolekce zatím deny write (otevřou se v dalších fázích).

## Akceptační kritéria

- Login/logout funguje proti emulátoru; nepřihlášený se na app nedostane.
- Member nevidí správu uživatelů; admin může přidat uživatele a změnit roli.
- `scripts/create-admin.ts` založí admina.
- Lint + build čisté, work-log, stav fáze, commit (`feat: auth a role`).
