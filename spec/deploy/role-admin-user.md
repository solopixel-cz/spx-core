# Nasazení: role `admin` + `user`

Runbook pro nasazení MR **feat/role-admin-user**. Sjednocuje tři role
(`admin`/`member`/`sales`) na dvě: `admin` (vše) a `user` (celé CRM kromě
financí — Faktury, Předplatné, Provize a Nastavení). Zároveň se ruší „sales"
omezení viditelnosti (user vidí všechny klienty) a Provize se skrývají z menu.

> **Pořadí je důležité.** Dodrž ho: kód → migrace → pravidla → ověření → úklid.

---

## Předpoklady
- Máš roli **admin** v produkčním prostředí.
- Máš přístup k `firebase` CLI a jsi přihlášený k projektu `markly-1bd84`
  (`firebase use markly-1bd84`).
- MR **feat/role-admin-user** je připravený k mergi.

---

## Krok 1 — nasadit kód na produkci
Mergni MR do své deployovací větve a nech Vercel dokončit build a nasazení.

Nasadit kód **před** migrací je nutné kvůli tomu, že nová verze bezpečně
normalizuje role (starší claimy `member`/`sales` bere přechodně jako `user`,
účet bez role nemá přístup).

✅ **Ověř:** produkční web je live na nové verzi, přihlášení funguje.

---

## Krok 2 — spustit jednorázovou migraci rolí
Přemapuje custom claims i pole `role` v kolekci `users`
(`member`/`sales` → `user`, `admin` zůstává) a změněným uživatelům revoknuje
refresh tokeny.

1. Otevři **produkční web** a přihlas se jako **admin**.
2. Otevři **DevTools → Console** a spusť:
   ```js
   fetch('/api/admin/migrate-roles', { method: 'POST' })
     .then(r => r.json())
     .then(console.log)
   ```
3. Očekávaný výstup:
   ```json
   { "status": "ok", "changedCount": <N>, "changed": [ ... ] }
   ```
   `changedCount` = počet přemapovaných uživatelů. Tvůj admin účet se nemění.

> ⚠️ Migrace **revoknuje tokeny** ostatním uživatelům → při dalším načtení se
> musí znovu přihlásit (tím se projeví nová role). Předem je upozorni.

Endpoint je **idempotentní** — opětovné spuštění nic nerozbije (jen znovu
projde a nic nezmění).

Když vrátí chybu:
- **401/403** — nejsi přihlášený jako admin. Přihlas se znovu a zopakuj.
- **500** — zkopíruj výstup z konzole a řeš s vývojem.

---

## Krok 3 — nasadit Firestore pravidla
Nová pravidla podmiňují čtení platnou rolí a finance (invoices, subscriptions,
commissions, invoiceEmails) omezují jen na `admin`.

```bash
firebase deploy --only firestore
```

> Pravidla přechodně tolerují i staré claimy `member`/`sales` (v helperu
> `isStaff()`), takže i kdyby se pořadí prohodilo, klientská čtení nespadnou.
> Po migraci (Krok 2) je lze z pravidel odebrat.

---

## Krok 4 — ověřit
**Jako admin:**
- V menu je **Fakturace** i **Nastavení**.
- Detail klienta: záložka **Faktury** a karta **Předplatné** jsou vidět.
- Dashboard ukazuje finanční metriky (MRR, faktury, blížící se fakturace).

**Jako user** (přihlas se testovacím účtem, nebo si ho vytvoř v
Nastavení → Uživatelé s rolí *Uživatel*):
- V menu **NENÍ** Fakturace ani Nastavení; Provize nikde.
- Detail klienta: **žádná** záložka Faktury ani karta Předplatné.
- Klienty vidí **všechny** (ne jen svoje).
- Přímý pokus o `/invoices` → přístup odmítnut.
- V aktivitě/feedu **nejsou** fakturační události.

---

## Krok 5 — uklidit migrační nástroj
Endpoint je jednorázový. Po úspěšné migraci ho odeber:

```bash
rm app/api/admin/migrate-roles/route.ts
git add -A
git commit -m "chore: odstranění jednorázové migrace rolí"
# push do své větve → Vercel deploy
```

---

## Krok 6 (doporučeno) — zamezit self-registraci
V bezpečnostním modelu je „účet bez role = žádný přístup", takže self-registrovaný
Firebase účet je bezcenný. Přesto je čistší zabránit jeho vzniku:

- Ve **Firebase / Identity Platform** projektu `markly-1bd84` přidej blocking
  function `beforeCreate`, která odmítne účty nezaložené přes admin flow
  (`/api/users`).

---

## Rollback
Změna nemění tvar dat (jen hodnotu `role`) a je zpětně kompatibilní na úrovni
čtení. Pokud je potřeba se vrátit:

1. **Kód** — nasadit předchozí verzi (revert MR / předchozí deploy na Vercelu).
   Stará verze bere `role: "user"` jako člena a `admin` jako admina; role `user`
   u ní spadne do defaultu (dřív „member") — tj. user by dočasně viděl i finance.
2. **Pravidla** — nasadit předchozí `firestore.rules`
   (`git checkout <předchozí-commit> -- firestore.rules && firebase deploy --only firestore`).
3. Data (claimy `user`) není nutné vracet; stará i nová verze je akceptují.

> Doporučení: rollback dělat jen když je to nutné — dočasně by `user` účty
> viděly finance (starý default). Lepší je opravit kupředu.

---

## Shrnutí pořadí
```
1. Merge MR → Vercel deploy (live)
2. POST /api/admin/migrate-roles   (jako admin, na produkci)
3. firebase deploy --only firestore
4. Ověřit (admin + user)
5. Smazat app/api/admin/migrate-roles/route.ts a nasadit
6. (volitelně) blocking function proti self-registraci
```
