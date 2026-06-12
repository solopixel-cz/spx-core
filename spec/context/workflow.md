# SPX Core — Workflow

Pravidla práce na projektu. Konvence sdílené se spx-dbc a solopixel-web.

## Postup vývoje

Aplikace se staví po fázích podle promptů ve [`spec/prompts/`](../prompts/00-prehled.md). Každá fáze = samostatná Claude Code session, končí funkčním stavem, zápisem do work-logu a commitem.

## Quality Loop

Po každé významné změně kódu:

1. **Lint** — `npm run lint` čistý
2. **Build** — `npm run build` čistý (zachytí typové chyby)
3. **Ověření v prohlížeči** — `npm run dev`, projít dotčené obrazovky; u zápisů ověřit data ve Firebase konzoli
4. **Zápis progresu** — do progress souboru fáze, jinak do `spec/plans/work-log.md`
5. **Commit se schválením** — ukázat diff → schválení → commit

U doc/context změn: konzistence → křížové odkazy → zastaralé reference → zápis progresu → commit (bez build/lint).

## Firebase zásady

- **Lokální vývoj proti reálnému Firebase projektu** (`.env.local`, `NEXT_PUBLIC_FIREBASE_EMULATOR=false`). Emulátory (`firebase emulators:start`) jsou volitelná možnost pro experimenty.
- **Opatrnost s daty:** destruktivní operace (hromadné mazání, migrace, seed skripty) jen po explicitní domluvě s uživatelem. Až aplikace poběží ostře, zvážíme oddělený dev projekt.
- **Rules a indexy:** změny `firestore.rules` / `firestore.indexes.json` patří do repa a nasazují se přes `firebase deploy --only firestore` — bez nasazení se v aplikaci neprojeví.
- Tajemství (service account) jen v env proměnných (Vercel / `.env.local`), nikdy v repu.

## Konvence

- **Commit formát:** `type: [changelog] popis` — stejné jako spx-dbc (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).
- **Chráněné větve:** `main`, `devel` — nikdy nepushovat bez schválení.
- **Progress recording:** do progress souboru feature, jinak `spec/plans/work-log.md`. Nikdy do `~/.claude/plans/`.
- **Session naming:** bez ikony za běhu, `✅ Téma – Shrnutí` po dokončení, `⚠️` blokováno, `↪️` předání.
- **Komponenty:** shadcn/ui primitiva v `components/ui/` (negenerovat ručně, používat CLI), doménové komponenty v `components/<doména>/`.
- **Schémata:** každá entita má zod schéma v `lib/schemas/`, typy jen přes `z.infer`.
