# Fáze 8 — Nasazení na Vercel

> Prompt pro Claude Code (část kroků je manuálních — Claude Code připraví konfiguraci a provede tě jimi). Navazuje na fázi 7.

## Zadání

### 1. Příprava repa

- Ověř `npm run build` čistý.
- `vercel.json` jen pokud je potřeba (default Next.js detekce obvykle stačí).
- Zkontroluj, že žádné tajemství není v repu (`git log -p | grep -i` na API klíče namátkou; `.env.local` v `.gitignore`).

### 2. Env proměnné (manuálně ve Vercel UI, připrav seznam)

- Všechny `NEXT_PUBLIC_FIREBASE_*` z `.env.example`.
- `FIREBASE_SERVICE_ACCOUNT` (JSON, Production + Preview).
- `NEXT_PUBLIC_FIREBASE_EMULATOR=false`.

### 3. Firebase produkční nastavení

- `firebase deploy --only firestore` (rules + indexy) a `--only storage` — ověř, že nasazená verze odpovídá repu.
- Firebase Auth → Authorized domains: přidat Vercel doménu (`*.vercel.app` + vlastní doménu, pokud bude).
- Zkontroluj session cookie: `secure: true` v produkci.

### 4. Deploy a smoke test

- Připojit repo k Vercelu (import projektu), branch `main` = production, `devel` = preview.
- Smoke test na produkční URL: login, vytvoření testovacího klienta + leadu + ticketu, drag & drop kanban, faktura, dashboard. Testovací data po ověření smazat.

### 5. Ochrana

- Vercel: production branch protection (deploy jen z `main`).
- Volitelně: Vercel Authentication (password protection) na preview deploye.

## Akceptační kritéria

- Aplikace běží na produkční URL, login funguje, všechny moduly použitelné.
- Rules/indexy/storage rules nasazené a odpovídají repu.
- Work-log, stav fáze, commit (`chore: konfigurace nasazení na Vercel`).
