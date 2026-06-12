# Fáze 10 — Role sales (obchodník)

> Prompt pro Claude Code. Před začátkem si přečti `spec/context/agents.md` a celý Required Reading řetězec. Navazuje na fázi 9 (Podklady).

## Kontext a záměr

Třetí role pro obchodníky, kteří shánějí klienty. Obchodní logika: obchodník potřebuje leady, klienty a podklady k onboardingu — **nesmí vidět ekonomiku firmy** (faktury, předplatná, reálné ceny klientů). Hranice musí být vynucená na úrovni Firestore rules a API, ne jen schovaná v UI.

| Oblast | admin | member | sales |
|--------|-------|--------|-------|
| Dashboard | plný | plný | ořezaný (bez financí) |
| Leady | ✅ | ✅ | ✅ (všechny — viz poznámka) |
| Klienti | ✅ | ✅ | ✅ bez záložky Faktury a karty Předplatné |
| Podklady | ✅ | ✅ | ✅ |
| Úkoly | ✅ | ✅ | ✅ |
| Tickety | ✅ | ✅ | ✅ (finance tam nejsou) |
| Fakturace + předplatná | ✅ | ✅ | ❌ |
| Šablony, Uživatelé | ✅ | ❌ | ❌ |

Poznámka: viditelnost všech leadů je záměr (malý interní tým). Až přijdou externí provizní obchodníci, omezí se na vlastní leady přes `ownerUid` — do `spec/context/project.md` zapiš jako budoucí rozhodnutí.

## Zadání

### 1. Role v systému

- `lib/schemas/user.ts`: `role: 'admin' | 'member' | 'sales'`.
- `lib/auth.ts`: rozšiř `requireRole` o podporu více rolí (`requireRole('admin', 'member')`).
- Správa uživatelů: role „Obchodník" v selectu (vytvoření i změna role nastaví claim).
- Aktualizuj `spec/context/data-model.md` (users.role).

### 2. Firestore rules

- `invoices`, `subscriptions`: `allow read: if role in ['admin', 'member']` (claim check) — sales je nesmí číst ani klientským SDK.
- `templates`: read all, write admin (beze změny). Ostatní kolekce beze změny.
- Nasadit `firebase deploy --only firestore` a ověřit.

### 3. API ochrana

- Route handlers `invoices`, `subscriptions`: `requireRole('admin', 'member')`.
- `GET /api/search`: beze změny (klienti/leady/tickety jsou pro sales OK).

### 4. UI

- Sidebar: položka Fakturace jen pro admin/member; Nastavení jen admin (šablony/uživatelé už jsou).
- Server-side ochrana stránek `/fakturace` a `/nastaveni/*` (redirect/404 pro sales) — ne jen skrytí v menu.
- Detail klienta: pro sales skrýt záložku Faktury, kartu Předplatné a finanční metriky na Přehledu (server-side, data se sales uživateli vůbec neposílají).
- Dashboard pro sales: jen karty pipeline leadů, moje úkoly, nevyřízené podklady. Bez faktur po splatnosti.

### 5. Hodnota leadu

- Pole `value` a `ownerUid` na leadu zůstávají viditelná všem — jsou základ pro budoucí výpočet provizí.

## Akceptační kritéria

- Sales uživatel: nevidí Fakturaci v menu, přímá URL vrátí redirect/404, API vrací 403, čtení `invoices`/`subscriptions` klientským SDK selže na rules (ověřit v konzoli prohlížeče).
- Detail klienta pro sales neobsahuje finanční data ani v payloadu (zkontrolovat network tab).
- Admin a member fungují beze změny.
- Lint + build čisté, ověření v prohlížeči za všechny tři role, work-log, stav fáze, commit (`feat: [changelog] role obchodníka s omezením na finance`).
