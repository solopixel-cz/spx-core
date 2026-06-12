# Fáze 15 — Dashboard layout v2 (uspořádání)

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Čistě UI fáze — žádné změny dat ani API (kromě nové stránky aktivity). Mockup cílového stavu odsouhlasen uživatelem.

## Problém

Pravý sloupec (Aktivita týmu) je výrazně delší než levý — položky aktivity jsou víceřádkové a je jich 10, takže vlevo pod feedem zůstává prázdné místo. Celek působí nevyváženě.

## Zadání

### 1. Nové rozložení (`components/dashboard/dashboard-client.tsx`)

- Horní řádek metrik beze změny (5 karet vč. mini grafu).
- Hlavní grid `lg:grid-cols-3`:
  - **Levý sloupec (col-span-2):** Vyžaduje akci → pod ním **Onboarding přehled** (přesun z dolní sekce).
  - **Pravý sloupec (1):** **Aktivita (kompaktní)** → pod ní nová karta **„Oslovení tento týden"** (osloveno / otevřelo / kliklo — data z `outreachEmails`, pro sales jen vlastní).
- Feed „Vyžaduje akci": max 8 položek + řádek „Zobrazit vše (N)" — proklik na příslušné moduly s předfiltrováním (jak už je).
- Spodní sekce (oslovování po obchodnících pro adminy) zůstává pod gridem na celou šířku.

### 2. Kompaktní aktivita

- Jedna řádka na záznam: kruhový avatar s iniciálami (16–20 px, barva dle uživatele), text s `truncate`, relativní čas vpravo (`2 h`, `včera`).
- Max **6** záznamů, žádné víceřádkové texty.
- Hlavička karty: „Aktivita" + odkaz **„Vše →"**.

### 3. Nová stránka `/aktivita`

- Plný log aktivity (server-side stránkování po 50, „Načíst další").
- Filtry: uživatel, typ entity (klient/lead/ticket/faktura/prospekt), období.
- Každý záznam s proklikem na entitu. PageHeader + EmptyState dle design systému.
- Sidebar: položka v sekci Přehled pod Dashboardem (ikona history). Viditelná všem; sales bez aktivit faktur/předplatných (stejné pravidlo jako dosud).

### 4. Responzivita a drobnosti

- Mobil: jeden sloupec v pořadí metriky → feed → onboarding → aktivita → oslovení.
- Všechny karty stejný vizuální vzor (border, radius, hlavička 12px medium) — sjednotit, pokud se někde liší.
- Prázdné stavy: krátká věta + ikona, ne prázdná karta.

## Akceptační kritéria

- Na 1440px obrazovce s reálnými daty nejsou pod žádným sloupcem velké prázdné plochy; aktivita nepřesahuje výšku levého sloupce.
- Záznam aktivity je vždy jednořádkový, „Vše →" vede na `/aktivita` s funkčními filtry a stránkováním.
- Karta „Oslovení tento týden" ukazuje správná čísla (porovnat s daty v `outreachEmails`).
- Lint + build čisté, vizuální kontrola light/dark + mobil, work-log, stav fáze, commit (`style: [changelog] přehlednější dashboard a stránka aktivity`).
