# Fáze 1 — Základ aplikace

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec.

## Zadání

Vytvoř scaffold aplikace SPX Core podle `spec/context/project.md`. Žádná byznys logika — jen kostra, na které postavíme moduly.

### 1. Inicializace projektu

- Next.js 16, App Router, TypeScript strict, `src/` NEpoužívat (app/ v rootu jako spx-dbc).
- Tailwind CSS 4, ESLint (next/core-web-vitals).
- shadcn/ui init — styl default, base color zinc, CSS variables. Nainstaluj primitiva: button, input, label, card, table, dialog, dropdown-menu, select, badge, tabs, sonner (toasty), sheet, avatar, separator, skeleton.
- Tmavý režim přes `next-themes` (class strategy), přepínač v topbaru.

### 2. Firebase

- Nainstaluj `firebase` + `firebase-admin`.
- `lib/firebase/client.ts` — lazy inicializace klientského SDK z `NEXT_PUBLIC_*` env.
- `lib/firebase/admin.ts` — singleton admin SDK ze service account env (`FIREBASE_SERVICE_ACCOUNT` JSON).
- `.env.example` se všemi proměnnými, `.env.local` v `.gitignore`.
- `firebase.json` + `firestore.rules` (zatím deny-all s TODO) + `firestore.indexes.json` (prázdné) + nastavení Emulator Suite (auth, firestore, storage).
- npm script `emulators` → `firebase emulators:start`.

### 3. Layout shell

- `app/(app)/layout.tsx` — levý sidebar + topbar:
  - Sidebar: logo SPX Core, navigace — Dashboard, Leady, Klienti, Fakturace, Úkoly, Tickety, Nastavení (lucide ikony). Aktivní stav. Na mobilu sbalený do Sheet.
  - Topbar: placeholder globálního vyhledávání (cmd+K, zatím neaktivní), přepínač dark mode, avatar menu (zatím statické).
- Stránky všech sekcí jako placeholdery s nadpisem a `<Skeleton>` ukázkou.
- `app/(auth)/login/page.tsx` — placeholder (řeší fáze 2).
- UI texty česky.

### 4. Schémata

- `lib/schemas/index.ts` + soubor pro každou entitu z `spec/context/data-model.md` (zod). Typy exportuj přes `z.infer`. Zatím bez použití — jen jako základ.

## Akceptační kritéria

- `npm run dev` — aplikace běží, sidebar naviguje mezi placeholder stránkami, dark mode funguje.
- `npm run lint` a `npm run build` čisté.
- Emulátory nastartují přes `npm run emulators`.
- Zápis do `spec/plans/work-log.md`, aktualizace stavu fáze v `spec/prompts/00-prehled.md`, commit se schválením (`feat: scaffold aplikace`).
