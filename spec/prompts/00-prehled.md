# Prompty pro Claude Code — přehled fází

Aplikace se staví v 6 fázích. Každá fáze = jedna Claude Code session s promptem z tohoto adresáře. Fáze na sebe navazují — nedávat Claude Code víc fází najednou.

| Fáze | Soubor | Obsah | Stav |
|------|--------|-------|------|
| 1 | [`01-zaklad.md`](01-zaklad.md) | Scaffold: Next.js, Tailwind, shadcn, Firebase, layout shell | ✅ |
| 2 | [`02-auth-role.md`](02-auth-role.md) | Přihlášení, custom claims role, ochrana rout, správa uživatelů | ✅ |
| 3 | [`03-klienti-instance.md`](03-klienti-instance.md) | Modul Klienti + DBC instance, detail klienta se záložkami | ⬜ |
| 4 | [`04-leady-pipeline.md`](04-leady-pipeline.md) | Kanban pipeline, konverze lead → klient + onboarding úkoly | ⬜ |
| 5 | [`05-fakturace.md`](05-fakturace.md) | Předplatné, faktury, číslování, přehled splatností | ⬜ |
| 6 | [`06-ukoly-tickety.md`](06-ukoly-tickety.md) | Úkoly, onboarding šablony, tickety (bug/change request), dashboard | ⬜ |

## Jak prompty používat

1. Otevři novou Claude Code session v repu spx-core.
2. Vlož obsah promptu fáze (nebo odkaž: „Proveď fázi podle spec/prompts/0X-….md").
3. Claude Code si přes CLAUDE.md načte Required Reading — prompty kontext neduplikují, jen odkazují.
4. Po dokončení: quality loop, zápis do work-logu, aktualizace stavu v této tabulce, commit.

## Společný kontrakt všech fází

Každý prompt předpokládá, že agent:
- přečetl Required Reading (`spec/context/agents.md` a dál),
- drží se datového modelu ve `spec/context/data-model.md`,
- vyvíjí proti Firebase emulátorům,
- končí čistým lintem + buildem a commitem se schválením.
