# Fáze 11 — Redesign (světlý vzhled s teal akcentem)

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Čistě vizuální fáze — žádné změny datového modelu, API ani rules.

## Záměr

Minimalistický, příjemný vzhled pro každodenní práci. Směr: **světlé rozhraní, neutrální zinc povrchy, teal akcent značky SoloPixel** (web používá teal-500 `#14b8a6` / teal-400). Dark mode zůstává (přepínač existuje) a přebírá stejný akcent. Žádné gradienty, stíny ani dekorace — čitelnost a klid.

## Zadání

### 1. Theme tokeny (globals.css)

- Přemapuj shadcn CSS proměnné: `--primary` na teal (světlý režim ~teal-600 pro kontrast textu, tmavý ~teal-400), ring/focus stejně. Neutrály nech zinc.
- `--radius` sjednotit (0.5rem). Sidebar dostane jemně odlišený povrch (zinc-50 / zinc-925).
- Ověř kontrast: teal text na bílé min. AA (proto teal-600, ne teal-400/500 na světlém pozadí).

### 2. Systém stavových barev

- Vytvoř `lib/status.ts` — jediné místo mapování stav → barva/štítek pro všechny entity (klient, lead, faktura, ticket, úkol, instance, předplatné):
  - zelená = aktivní / zaplaceno / live / vyřešeno
  - žlutá/amber = čeká / onboarding / nabídka / waiting_client
  - červená = po splatnosti / urgent / offline / churned
  - modrá = nové / v řešení
  - šedá = neutrální (draft, paused, closed)
- Všechny badge v aplikaci předělat na tento systém (jednotné varianty, ne ad-hoc `variant=` po komponentách).

### 3. Typografie a čísla

- Font: Geist Sans (`next/font`), fallback systémový.
- Částky, čísla faktur a data v tabulkách: `font-variant-numeric: tabular-nums`, částky zarovnat doprava, formátovat přes `Intl.NumberFormat('cs-CZ')` helper v `lib/format.ts` (sjednotit existující ad-hoc formátování).

### 4. Sidebar

- Seskupit do bloků s drobnými nadpisy: **Přehled** (Dashboard), **Obchod** (Leady, Klienti, Podklady), **Provoz** (Úkoly, Tickety), **Finance** (Fakturace), dole Nastavení.
- Počítadla u položek: nové podklady, faktury po splatnosti, moje otevřené úkoly (malé badge, realtime kde už listener existuje).
- Aktivní položka: teal text + jemné teal pozadí (viz mockup A).
- Respektovat role z fáze 10 (sales nevidí Finance).

### 5. Konzistence stránek

- Jednotná hlavička stránky: titulek vlevo, primární akce vpravo (teal button), pod tím filtry. Vytáhnout do komponenty `PageHeader`.
- Prázdné stavy: ikona + věta + CTA („Zatím žádné leady — přidej první") místo prázdné tabulky. Komponenta `EmptyState`.
- Tabulky: hustší řádky (py-2), hover zvýraznění, sticky header u dlouhých výpisů.
- Dashboard: stat karty bez rámečků (jemné pozadí), čísla 24px, konzistentní prokliky.
- Toasty, dialogy, sheety — projít a sjednotit odsazení/velikosti.

### 6. Login

- Jednoduchá centrovaná karta s logem SPX Core a teal akcentem — první dojem aplikace.

## Postup

Po každém kroku vizuální kontrola v prohlížeči (light i dark mode) — fáze je iterativní, ne jeden velký commit. Commity po krocích (`style: ...`).

## Akceptační kritéria

- Light i dark mode konzistentní, žádný hardcoded color mimo tokeny a `lib/status.ts`.
- Stejný stav má stejnou barvu všude (lead Nabídka, faktura Po splatnosti…).
- Částky v tabulkách lícují, sidebar seskupený s počítadly, prázdné stavy s CTA.
- Lint + build čisté, projít všechny stránky v obou režimech, work-log, stav fáze, commit (`style: [changelog] redesign — teal vzhled`).
