# CLAUDE.md

Toto je **gateway** pro AI agenty pracující na tomto repu. Hluboký kontext žije ve `spec/context/`.

## Project Overview

**SPX Core** — interní CRM pro SoloPixel digitální vizitky. Spravuje klienty (finanční poradce) a jejich DBC instance, obchodní pipeline, fakturaci a předplatné, úkoly/onboarding a tickety (bugy, požadavky na změnu).

| Vrstva | Stack |
|--------|-------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| **Backend** | Firebase — Firestore, Auth (custom claims role), Storage |
| **Server** | Server Components + Route Handlers s firebase-admin |
| **Infra** | Vercel; lokální vývoj proti reálnému Firebase projektu (emulátory volitelné) |

```
spx-core/
├── app/              Next.js App Router (stránky, route handlers)
├── components/       ui/ (shadcn) + doménové komponenty
├── lib/              firebase klient/admin, schemas/ (zod), utils
├── spec/             AI workflow — context, plans, prompts
└── .claude/          Agent nastavení
```

## Agent Workflow

**Required Reading:** Začni přečtením [`spec/context/agents.md`](spec/context/agents.md) a projdi celý Required Reading řetězec před jakoukoli prací.

Pořadí čtení:
1. [`spec/context/agents.md`](spec/context/agents.md) — role a Required Reading
2. [`spec/context/project.md`](spec/context/project.md) — co je projekt, architektura, UI koncept
3. [`spec/context/data-model.md`](spec/context/data-model.md) — Firestore kolekce, rules, indexy
4. [`spec/context/workflow.md`](spec/context/workflow.md) — quality loop, konvence
5. Tento soubor — rychlá reference a dev příkazy
6. [`spec/plans/index.md`](spec/plans/index.md) — stav fází
7. [`spec/plans/work-log.md`](spec/plans/work-log.md) — historie sessions

Stavba aplikace probíhá po fázích — prompty ve [`spec/prompts/`](spec/prompts/00-prehled.md).

## Key Conventions

- **Progress recording:** do progress souboru feature, jinak `spec/plans/work-log.md`. Nikdy do `~/.claude/plans/`.
- **Commit workflow:** ukázat diff → schválení → commit. Nikdy nepushovat na chráněné větve (`main`, `devel`).
- **Commit formát:** `type: [changelog] popis` (viz `spec/context/workflow.md`).
- **Datový model:** zdroj pravdy je `spec/context/data-model.md` — změny nejdřív tam.
- **Lokální vývoj:** proti reálnému Firebase projektu (`.env.local`). Destruktivní operace (hromadné mazání, migrace) jen po domluvě. Změny `firestore.rules` / indexů nasazovat přes `firebase deploy --only firestore`.

## Dev Commands

```bash
npm run dev          # Next.js dev server na :3000
npm run build        # produkční build
npm run lint         # ESLint
firebase emulators:start   # volitelné — emulátory, pokud nechceš sahat na reálná data
firebase deploy --only firestore   # nasazení rules + indexů
```

Zatím není nakonfigurován test runner.

## Quality Loop (lightweight)

1. **Lint** — `npm run lint` čistý
2. **Build** — `npm run build` čistý
3. **Ověření v prohlížeči** — dotčené obrazovky + data ve Firebase konzoli
4. **Zápis progresu** — progress soubor fáze nebo `spec/plans/work-log.md`
5. **Commit se schválením**

U docs/context změn: konzistence → křížové odkazy → zastaralé reference → zápis progresu → commit.
