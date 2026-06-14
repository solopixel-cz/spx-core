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
| 8 | [`08-nasazeni-vercel.md`](08-nasazeni-vercel.md) | Nasazení na Vercel, env, rules deploy, smoke test | ✅ |
| 9 | [`09-podklady-formulare.md`](09-podklady-formulare.md) | Podklady z webového formuláře: rules fix, generování tokenů, inbox | ✅ |
| 10 | [`10-role-sales.md`](10-role-sales.md) | Role sales (obchodník) — bez přístupu k financím | ✅ |
| 11 | [`11-redesign.md`](11-redesign.md) | Redesign — světlý teal vzhled, stavové barvy, sidebar skupiny | ✅ |
| 12 | [`12-dashboard.md`](12-dashboard.md) | Akční dashboard: feed Vyžaduje akci, MRR, onboarding, aktivita | ✅ |
| 13 | [`13-prospekti.md`](13-prospekti.md) | Prospekti — zásobník oslovení, zabírání, log kontaktů, CSV import | ✅ |
| 14 | [`14-emailove-osloveni.md`](14-emailove-osloveni.md) | E-mailové oslovení přes Resend — šablona, demo odkaz, webhooky | ✅ |
| 15 | [`15-dashboard-layout.md`](15-dashboard-layout.md) | Dashboard layout v2 — kompaktní aktivita, stránka /aktivita | ✅ |
| 16 | [`16-provize.md`](16-provize.md) | Provizní systém — vlastnictví, automatické provize, vyúčtování | ✅ |
| 17 | [`17-sales-viditelnost-klientu.md`](17-sales-viditelnost-klientu.md) | Sales vidí jen své klienty + auto-přiřazení při vytvoření | ✅ |
| 18 | [`18-profil.md`](18-profil.md) | Profil uživatele — fotka, jméno, heslo, preference | ✅ |
| 19 | [`19-rename-prospekti.md`](19-rename-prospekti.md) | Přejmenování UI „Prospekti” → „Oslovení” (Firestore beze změny) | ✅ |
| 20 | [`20-mazani-archivace.md`](20-mazani-archivace.md) | Archivace (měkké smazání) + trvalé mazání bez vazeb | ✅ |
| 21 | [`21-nastaveni-rozcestnik.md`](21-nastaveni-rozcestnik.md) | Nastavení jako rozcestník — zpřístupnění šablon a archivu | ✅ |
| 22 | [`22-html-sablona-osloveni.md`](22-html-sablona-osloveni.md) | HTML šablona oslovení v designu SoloPixel (pevný design, editovatelný předmět) | ✅ |
| 23 | [`23-sjednoceni-domeny-cz.md`](23-sjednoceni-domeny-cz.md) | Sjednocení domény na solopixel.cz (CRM + e-mail; web zvlášť) | ✅ |
| 24 | [`24-odesilatel-osloveni.md`](24-odesilatel-osloveni.md) | Odesílatel oslovení — override jen pro admina | ✅ |
| 25 | [`25-mazani-osloveni.md`](25-mazani-osloveni.md) | Archivace a mazání kontaktů v Oslovení (vč. hromadného úklidu) | ✅ |
| 26 | [`26-auto-refresh.md`](26-auto-refresh.md) | Auto-refresh seznamů po akcích (router.refresh + optimistické UI) | ✅ |

**Pořadí:** fáze 1–26 hotové, aplikace v produkci.

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
