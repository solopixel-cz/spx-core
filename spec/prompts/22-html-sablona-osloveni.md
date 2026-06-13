# Fáze 22 — HTML šablona oslovení (SoloPixel design)

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a Required Reading. Navazuje na fázi 14 (odesílání přes Resend).

## Záměr

Oslovovací e-mail má chodit v brandovém HTML designu SoloPixel (ne plain text). Design je **pevný** (zadrátovaný v kódu), z Nastavení se edituje jen **předmět**. Jediné runtime proměnné v těle: `{{jmeno}}` (oslovení) a `{{odkaz}}` (demo URL, vždy demo.solopixel.cz). Hotová HTML šablona je v repu jako `spec/assets/osloveni-email.html` (přilož soubor, který dodá uživatel) — z něj vyjdi.

## Zadání

### 1. Pevná HTML šablona

- `lib/email-templates/outreach.ts` — funkce `renderOutreachEmail({ jmeno, odkaz }): string` vracející kompletní HTML (email-safe: tabulkový layout, inline styly, žádný externí CSS kromě webfontu). Obsah převzít z dodaného HTML; nahradit `{{jmeno}}` a `{{odkaz}}` (escapovat, ať se nerozbije HTML/atributy).
- Plain-text fallback (`text` verze do Resendu) — krátká textová varianta se stejným sdělením a odkazem (kvůli doručitelnosti a klientům bez HTML).

### 2. Napojení na odesílání

- `lib/email.ts` / handler odeslání oslovení: místo dosavadního plain-text renderu volat `renderOutreachEmail` (html) + text fallback. Předmět brát z `templates/outreach-email` (editovatelný), default `„{{jmeno}}, takhle dnes vypadá vizitka, co pracuje za vás"` — `{{jmeno}}` doplnit i v předmětu.
- `{{odkaz}}` default = `https://demo.solopixel.cz`; pokud má prospekt `demoUrl`, použít jeho hodnotu (zachovat z fáze 14). Pozn.: pro plošné oslovení teď stačí společné demo, demoUrl je volitelný override.

### 3. Nastavení → Šablony

- Sekci „Šablona oslovení" zjednodušit: editovatelný **jen předmět** + **náhled HTML** (iframe/sandbox s ukázkovými daty „Jan Novák", demo URL). Tělo už není volný text — zobrazit info „Tělo e-mailu je v jednotném designu SoloPixel". Placeholdery `{{jmeno}}`, `{{odkaz}}` zdokumentovat u předmětu.
- „Poslat testovací e-mail" pošle plný HTML na adresu přihlášeného.

### 4. Detaily

- Logo a obrázky přes absolutní URL (solopixel.cz/images/...). Ověřit, že logo URL existuje a je veřejné.
- Náhled v dialogu „Odeslat oslovení" (fáze 14) přepnout na render HTML šablony (iframe), ať obchodník vidí finální podobu.
- Compliance patička (identifikace + opt-out) je součást designu — needitovatelná.

## Akceptační kritéria

- Odeslaný e-mail dorazí v brandovém designu, `{{jmeno}}` i `{{odkaz}}` správně doplněné, tlačítko i fallback odkaz míří na demo.
- Náhled v Nastavení i v dialogu odeslání ukazuje reálnou HTML podobu.
- Test e-mail se zobrazí korektně v Gmailu i mobilu (uživatel ověří); plain-text fallback existuje.
- Lint + build čisté, work-log, stav fáze, commit (`feat: [changelog] HTML šablona oslovení v designu SoloPixel`).
