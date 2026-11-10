# Zadání: Ochrana formuláře proti spamu (web → CRM)

Zadal: hlavní vlákno (COO + CTO), Lukáš 5. 11. 2026 · Tabule **#27** · Repa `spx-web` (formulář `/kontakt`, proxy `pages/api/lead.ts`) a `spx-core` (příjem `app/api/leads/intake`, Oslovení `prospects`). Stejný soubor v obou repech · Režim: bez dozoru, zastav před PR do `main`

## Proč
Do CRM opakovaně chodí obchodní nabídky přes formulář na solopixel.cz/cs/kontakt. Příklad z 5. 11.: „Field Sales Germany“ (field-sales.de, telefon +49…) napsala už několikrát.
- **Vyplňuje to člověk ručně:** do volného pole „Obor“ dal předmět „Re: Spolupráce na poskytování aktivních prodejních služeb v Německu“, celou nabídku dal do poznámky.
- Každá taková zpráva založí kontakt v **Oslovení** (zdroj `web`, stav `new`), pošle upozornění a **kazí čísla obchodního trychtýře**.

**Stav (zjištěno 5. 11.):** formulář ani API **nemají žádnou ochranu**. Chybí honeypot, kontrola doby vyplnění, rate limit, captcha, blokace odesílatelů a stav „spam“ v CRM.

**Zásada:** skutečná poptávka **nikdy nesmí zmizet**. Nic se automaticky nemaže. Podezřelé věci jdou do složky **Spam**, kterou jde projít a jedním klikem vrátit.

## 1. spx-core: stav Spam a blokovaní odesílatelé (nejdůležitější)
- **Stav `spam`** v `prospectStatusValues` (`lib/schemas/prospect.ts`), plus pole `spamReason` (`blocked_sender | heuristics | manual`) a `spamSignals[]`.
- **Seznam Oslovení** nezobrazuje `spam` ve výchozím filtru. Nová záložka nebo filtr **„Spam“** ukazuje počet a seznam s důvodem a signály. Akce **„Není spam“** vrátí kontakt do stavu `new` a odesílatele odblokuje.
- **Spam se nikam nepočítá:** statistiky Oslovení, trychtýř, přehledy, nástěnka ani počty podle kampaní (`attribution`).
- **Akce „Označit jako spam“** na detailu kontaktu i hromadně v seznamu:
  - nastaví `status: spam`, `spamReason: manual`,
  - nabídne zaškrtnutí, **co zablokovat**: e-mail, telefon (normalizovaný E.164), doménu e-mailu a doménu z odkazů v poznámce (např. `field-sales.de`). Výchozí zaškrtnutí: e-mail + telefon + doména, **kromě** freemail domén (gmail.com, seznam.cz, email.cz, centrum.cz, outlook.com, icloud.com, yahoo.com, post.cz…), ty se blokovat nesmí,
  - **zpětně** projde existující kontakty ze zdroje `web` se stejným e-mailem, telefonem nebo doménou a nabídne je označit taky. Ukáže počet a seznam ke schválení.
- **Blokovaní odesílatelé:** nová kolekce `blockedSenders` `{ type: email | phone | domain, value, reason, createdBy, createdAt, hits, lastHitAt }`. Správa v **Nastavení → Ochrana formuláře**: seznam, ruční přidání, odblokování. Pravidla Firestore jen pro admin SDK, jako ostatní interní kolekce.
- **Příjem `POST /api/leads/intake`:**
  - před založením kontaktu ověř odesílatele proti `blockedSenders` (e-mail, telefon, doména e-mailu, domény odkazů v `note`/`message`/`link`),
  - **při shodě:** kontakt se **založí** se `status: spam`, `spamReason: blocked_sender`, zvýší se `hits`, **bez upozornění** (`notify` se nevolá) a bez zápisu do počtů. Odpověď webu je **stejná jako u úspěchu** (200 + id), aby odesílatel nepoznal, že je blokovaný,
  - stejně se zachází s poptávkou, kterou web pošle s příznakem podezření (bod 3, `suspect: true`) → `spamReason: heuristics` + `spamSignals`.
- **Volitelný týdenní přehled:** pokud ve Spamu za poslední týden něco přibylo, jedno souhrnné upozornění v pondělí ráno „Ve Spamu je X zpráv, projděte je“. Žádné upozornění na každou zprávu.
- Audit: označení, odznačení, blokace a odblokování (`logActivity`).

## 2. spx-web: kontrola na serveru (`pages/api/lead.ts`)
Proxy dnes přepošle cokoli. Doplnit validaci **zod** před odesláním do CRM:
- **Délky:**
  - `name` 2–100 znaků, `industry` max 80, `company` max 200,
  - `note`/`message` max 2 000,
  - `phone` 6–25 znaků jen z povolených (číslice, mezery, +, -, závorky),
  - `email` platný formát.
- **Výběrová pole:** `plan`, `product`, `teamType` jen z povolených hodnot (`WEB_PLANS` a seznam tarifů). Jinak 400.
- `industry` je volný text. **Nevalidovat přísně**, jen jako signál (bod 3): „Re:“ nebo „Fwd:“ na začátku, URL nebo e-mail v poli Obor.
- Chyby validace vrací 400 s obecnou hláškou. Formulář je zobrazí u polí, jako dnes povinná pole.

## 3. spx-web: ochrana proti robotům a podezřelé zprávy
- **Honeypot:** skryté pole (např. `website`) mimo obrazovku, `tabIndex={-1}`, `autocomplete="off"`, `aria-hidden`. Když je vyplněné → **neposílat do CRM**, vrátit 200 jako úspěch.
- **Doba vyplnění:** čas vykreslení formuláře se pošle s odesláním (`formStartedAt`, podepsaný HMAC tajemstvím serveru, aby nešel podvrhnout). Odesláno **dřív než za 3 s** → jako honeypot. Chybějící nebo neplatný podpis → podezřelé (signál), ne odmítnutí.
- **Rate limit** v proxy:
  - max **3 odeslání za hodinu a 10 za den z jedné IP**,
  - max **2 za den se stejným e-mailem nebo telefonem**,
  - nad limit 429 s hláškou „Zprávu jsme už přijali, ozveme se vám.“
  - In-memory podle vzoru `spx-dbc/lib/chat/rateLimit.ts`. Pokud to na Vercelu nestačí kvůli víc instancím, navrhni v progress úložiště (např. Upstash).
- **Heuristika podezření.** Neblokuje, jen pošle `suspect: true` + `spamSignals[]` do CRM, které kontakt založí ve Spamu. Za signál se počítá:
  - zahraniční telefonní předvolba mimo +420 a +421 (na české a slovenské verzi webu),
  - URL v poznámce, Oboru nebo jménu,
  - „Re:“, „Fwd:“ nebo „AW:“ v Oboru nebo na začátku poznámky,
  - typické fráze obchodních nabídek: „hledáte zákazníky“, „outsourcing“, „SEO služby“, „backlink“, „we offer“, „guest post“, „spolupráce na poskytování“…, seznam v jednom konfiguračním souboru,
  - poznámka delší než 600 znaků **a zároveň** prázdný tarif,
  - neplatný podpis `formStartedAt`.
  
  Za podezřelé **se označí až při 2 a víc signálech**. Jeden signál se jen zapíše k poptávce.
- **Uživatelský dojem se nemění.** Žádný captcha v této vlně. Skutečný zájemce nic nového nevidí.

## 4. Captcha (jen připravit, nezapínat)
Připravit integraci **Cloudflare Turnstile** (bez cookies Googlu, neviditelný režim) za přepínačem env `TURNSTILE_ENABLED=false`. Zapne se jen tehdy, když body 1–3 nebudou stačit. Do progress napsat, jak ho zapnout.

## 5. Jednorázový úklid
Skript nebo akce v CRM: najdi existující kontakty ze zdroje `web` od Field Sales Germany (e-mail, telefon `+493082689286`, doména `field-sales.de`) a podobné obchodní nabídky podle heuristiky. **Ukaž seznam ke schválení** (dry-run), po potvrzení je označ jako spam a odesílatele zablokuj. Nic nemazat.

## Hotovo, když
- [ ] CRM:
  - stav `spam`, filtr a záložka Spam s důvody, „Není spam“,
  - spam se nepočítá do čísel ani trychtýře,
  - „Označit jako spam“ s výběrem, co blokovat (ne freemail), zpětné dohledání,
  - Nastavení → Ochrana formuláře.
- [ ] Příjem: blokovaný odesílatel → kontakt ve Spamu bez upozornění, web dostane úspěch. `suspect` → Spam se signály.
- [ ] Web:
  - validace zod (délky, povolené hodnoty),
  - honeypot, minimální doba vyplnění s podpisem,
  - rate limit na IP a kontakt,
  - heuristika (≥ 2 signály → podezřelé), seznam frází v konfiguraci.
- [ ] Turnstile připravený za vypnutým přepínačem.
- [ ] Úklid: dry-run seznam pro Lukáše, po schválení provedeno.
- [ ] **Testy:**
  - skutečná poptávka (české číslo, bez odkazu, vybraný tarif) projde do Oslovení s upozorněním,
  - zpráva z příkladu 5. 11. skončí ve Spamu,
  - blokovaný e-mail, telefon i doména,
  - freemail se blokovat nedá,
  - honeypot a rychlé odeslání nic nezaloží,
  - rate limit,
  - „Není spam“ vrátí kontakt a odblokuje odesílatele.
- [ ] `tsc`, `lint`, `build` zelené v obou repech. progress, work-log, CHANGELOG. Push → preview. **Zastav před PR do `main`.** Do progress napiš pořadí nasazení (core → web) a nové env proměnné (`LEAD_FORM_HMAC_SECRET`, `TURNSTILE_*`).
