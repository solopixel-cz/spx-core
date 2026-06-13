# Fáze 21 — Nastavení jako rozcestník

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a Required Reading. Drobná navigační oprava.

## Problém

`/nastaveni` jen `redirect("/nastaveni/uzivatele")`. Podstránky `/nastaveni/sablony` a `/nastaveni/archiv` (a výchozí sazba provize) existují, ale **nevede na ně žádný odkaz** — jsou dostupné jen přímou URL. Uživatel je nenajde.

## Zadání

- `/nastaveni` předělat z redirectu na **rozcestník** (přehledové dlaždice/karty s ikonou, názvem, popisem a odkazem):
  - **Uživatelé** (admin) — správa týmu
  - **Šablony** (admin) — onboarding checklist + šablona oslovení
  - **Archiv** (admin/member) — archivované záznamy (z fáze 20)
  - **Provize** (admin) — výchozí sazba + osobní sazby (pokud je dnes jinde, odkázat sem; jinak ponechat kde je a jen přidat odkaz)
  - **Můj profil** — odkaz na `/profil`
- Dlaždice filtrovat dle role (sales sem stejně nemá přístup; member nevidí Uživatele/Šablony, pokud jsou admin-only — respektovat stávající oprávnění).
- Sidebar: položka **Nastavení** vede na `/nastaveni` (rozcestník), ne rovnou na uživatele.
- Konzistentní s PageHeader a design systémem (fáze 11). Žádná nová data ani API.

## Akceptační kritéria

- Z `/nastaveni` se proklikem dostanu na Šablony, Archiv i Uživatele — nic není dostupné jen přímou URL.
- Dlaždice respektují roli (member/sales nevidí, na co nemá právo).
- Lint + build čisté, ověření za admin i member, work-log, stav fáze, commit (`fix: [changelog] nastavení jako rozcestník — zpřístupnění šablon a archivu`).
