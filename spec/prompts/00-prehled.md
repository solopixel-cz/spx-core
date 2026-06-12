# Prompty pro Claude Code — přehled fází

Aplikace se staví v 6 fázích. Každá fáze = jedna Claude Code session s promptem z tohoto adresáře. Fáze na sebe navazují — nedávat Claude Code víc fází najednou.

| Fáze | Soubor | Obsah | Stav |
|------|--------|-------|------|
| 1 | [`01-zaklad.md`](01-zaklad.md) | Scaffold: Next.js, Tailwind, shadcn, Firebase, layout shell | ✅ |
| 2 | [`02-auth-role.md`](02-auth-role.md) | Přihlášení, custom claims role, ochrana rout, správa uživatelů | ✅ |
| 3 | [`03-klienti-instance.md`](03-klienti-instance.md) | Modul Klienti + DBC instance, detail klienta se záložkami | ✅ |
| 4 | [`04-leady-pipeline.md`](04-leady-pipeline.md) | Kanban pipeline, konverze lead → klient + onboarding úkoly | ✅ |
| 5 | [`05-fakturace.md`](05-fakturace.md) | Předplatné, faktury, číslování, přehled splatností | ✅ |
| 6 | [`06-ukoly-tickety.md`](06-ukoly-tickety.md) | Úkoly, onboarding šablony, tickety (bug/change request), dashboard | ✅ |
| 7 | [`07-doplnky.md`](07-doplnky.md) | Realtime, přílohy ticketů, cmd+K, úkoly k ticketům, správa hesel | ✅ |
| 8 | [`08-nasazeni-vercel.md`](08-nasazeni-vercel.md) | Nasazení na Vercel, env, rules deploy, smoke test | ⬜ |
| 9 | [`09-podklady-formulare.md`](09-podklady-formulare.md) | Podklady z webového formuláře: rules fix, generování tokenů, inbox | ✅ |
| 10 | [`10-role-sales.md`](10-role-sales.md) | Role sales (obchodník) — bez přístupu k financím | ⬜ |
| 11 | [`11-redesign.md`](11-redesign.md) | Redesign — světlý teal vzhled, stavové barvy, sidebar skupiny | ⬜ |

**Pořadí:** 9 → 10 → 8. Fáze 9 musí proběhnout PŘED fází 8 — fáze 8 nasazuje Firestore/Storage rules, které by bez fixu z fáze 9 rozbily formulář na webu. Fáze 10 navazuje na 9 (Podklady v sidebaru pro sales).

## Jak prompty používat

1. Otevři novou Claude Code session v repu spx-core.
2. Vlož obsah promptu fáze (nebo odkaž: „Proveď fázi podle spec/prompts/0X-….md").
3. Claude Code si přes CLAUDE.md načte Required Reading — prompty kontext neduplikují, jen odkazují.
4. Po dokončení: quality loop, zápis do work-logu, aktualizace stavu v této tabulce, commit.

## Společný kontrakt všech fází

Každý prompt předpokládá, že agent:
- přečetl Required Reading (`spec/context/agents.md` a dál),
- drží se datového modelu ve `spec/context/data-model.md`,
- vyvíjí proti reálnému Firebase projektu (viz `spec/context/workflow.md` — opatrně s daty, rules nasazovat přes `firebase deploy --only firestore`),
- končí čistým lintem + buildem a commitem se schválením.
