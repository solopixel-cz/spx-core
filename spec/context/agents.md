# SPX Core — Agents & Required Reading

## Required Reading (v tomto pořadí)

1. Tento soubor
2. [`project.md`](project.md) — co je SPX Core, stack, architektura, UI koncept
3. [`data-model.md`](data-model.md) — Firestore kolekce, rules, indexy
4. [`workflow.md`](workflow.md) — quality loop, konvence, Firebase zásady
5. `CLAUDE.md` (root) — rychlá reference a dev příkazy
6. [`../plans/index.md`](../plans/index.md) — stav fází
7. [`../plans/work-log.md`](../plans/work-log.md) — historie sessions

## Role

| Role | Účel |
|------|------|
| **Architect** | Plánování fází, review, návrh datového modelu |
| **Developer** | Implementace, debugging — výchozí role |

Bez explicitní role se chovej jako Developer.

## Zásady pro agenty

- Před prací vždy projdi Required Reading — kontext je v `spec/context/`, ne v hlavě.
- Drž se datového modelu v `data-model.md`. Změny modelu nejdřív zapiš tam, pak implementuj.
- Nové stránky/moduly následují vzory existujících (struktura, naming, shadcn primitiva).
- Po dokončení zapiš progres a commitni se schválením (viz `workflow.md`).
