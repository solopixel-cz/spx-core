# Zadání pro Claude Code — Podklady: doplnění nových polí formuláře

## Cíl

Web formulář vizitky (`solopixel-web`) nově sbírá další pole. Tahle data se ukládají do Firestore kolekce `card-submissions`, ale CRM je zatím nečte ani nezobrazuje. Cílem je provést nová pole celým řetězcem v `spx-core` tak, aby se zobrazila na stránce **Podklady** a hlavně se dostala do výstupu tlačítka **„Kopírovat pro AI"** (`buildSubmissionPrompt`), který slouží k tvorbě profilu vizitky.

**Scope = repozitář `spx-core`.** Navazuje na zadání pro `solopixel-web` (doplnění polí do formuláře).

---

## ⚠️ Důležité — pole musí projít ČTYŘMI místy

API route mapuje pole **explicitně** (ne spreadem), takže nestačí upravit schéma. Nová pole je nutné doplnit všude:

1. `lib/schemas/card-submission.ts` — Zod schéma (zdroj pravdy).
2. `app/api/submissions/route.ts` — GET handler, explicitní mapování `data.X`.
3. `components/submissions/submissions-page-client.tsx` — lokální `Submission` interface + zobrazení v detailu (Sheet).
4. `lib/submission-prompt.ts` — `SubmissionData` interface + tělo `buildSubmissionPrompt`.

Vynechání kteréhokoli místa = pole se buď nedostane na klienta, nebo se neobjeví ve výstupu pro AI.

---

## Nová pole

| Pole | Typ | Pozn. |
|---|---|---|
| `companyName` | string, **optional** | Název společnosti / značka (ZFP, OVB…). Ve formuláři povinné, ale ve schématu **optional** kvůli zpětné kompatibilitě se staršími podklady, které ho nemají. |
| `whatsapp` | string, optional | |
| `motto` | string, optional | Krátký slogan / oneLiner. |
| `instagram` | string, optional | URL |
| `linkedin` | string, optional | URL |
| `facebook` | string, optional | URL |
| `website` | string, optional | Profesní/firemní web (jiné než `customDomain`). |
| `referenceUrl` | string, optional | Odkaz na reference (např. dobryporadce.cz). |
| `wantsCareerTab` | boolean, optional | Zájem o sekci „Spolupráce" (nábor). |

> Pozn.: všechna pole `optional`, protože v Firestore existují starší dokumenty bez nich. Kdyby byla povinná, čtení starých podkladů by spadlo na validaci.

---

## 1. `lib/schemas/card-submission.ts`

Do `cardSubmissionSchema` doplnit (vhodně k podobným polím):

```ts
companyName: z.string().optional(),
whatsapp: z.string().optional(),
motto: z.string().optional(),
instagram: z.string().optional(),
linkedin: z.string().optional(),
facebook: z.string().optional(),
website: z.string().optional(),
referenceUrl: z.string().optional(),
wantsCareerTab: z.boolean().optional(),
```

> URL pole nech jako `z.string().optional()`, ne `.url()` — formulář může poslat hodnotu bez schématu (`instagram.com/...`) a nechceme tvrdou validaci na straně CRM.

---

## 2. `app/api/submissions/route.ts`

V `submissionsSnap.docs.map(...)` do vraceného objektu doplnit explicitní mapování:

```ts
companyName: data.companyName,
whatsapp: data.whatsapp,
motto: data.motto,
instagram: data.instagram,
linkedin: data.linkedin,
facebook: data.facebook,
website: data.website,
referenceUrl: data.referenceUrl,
wantsCareerTab: data.wantsCareerTab,
```

---

## 3. `components/submissions/submissions-page-client.tsx`

### 3a. Rozšířit `Submission` interface

```ts
companyName?: string;
whatsapp?: string;
motto?: string;
instagram?: string;
linkedin?: string;
facebook?: string;
website?: string;
referenceUrl?: string;
wantsCareerTab?: boolean;
```

### 3b. Zobrazení v detailu (Sheet)

- **Sekce „Kontakt"** — doplnit Společnost a WhatsApp:
  ```tsx
  <Field label="Společnost" value={selected.companyName} />
  <Field label="WhatsApp" value={selected.whatsapp} />
  ```
  (Společnost dej nad IČO, WhatsApp pod Telefon.)

- **Sekce „Profese" nebo „Profil"** — doplnit Motto a zájem o Spolupráci:
  ```tsx
  <Field label="Motto" value={selected.motto} />
  <Field label="Zájem o Spolupráci" value={selected.wantsCareerTab ? "Ano" : undefined} />
  ```
  Motto se hodí do „Profil" (k bio), zájem o Spolupráci do „Profese". `Field` skrývá prázdné hodnoty, takže `undefined` znamená nezobrazit.

- **Nová sekce „Sociální sítě a reference"** — vlož nový `<Separator />` + `<Section>` (např. před sekci „Vizitka"):
  ```tsx
  <Separator />
  <Section title="Sociální sítě a reference">
    <Field label="Instagram" value={selected.instagram} />
    <Field label="LinkedIn" value={selected.linkedin} />
    <Field label="Facebook" value={selected.facebook} />
    <Field label="Web" value={selected.website} />
    <Field label="Reference" value={selected.referenceUrl} />
  </Section>
  ```

> Komponenty `Section` a `Field` už existují, nic nového nevytvářej.

---

## 4. `lib/submission-prompt.ts`

Tohle je výstup pro AI tvořící profil. Nová pole sem musí přijít, jinak je AI nedostane.

### 4a. Rozšířit `SubmissionData` interface

```ts
companyName?: string;
whatsapp?: string;
motto?: string;
instagram?: string;
linkedin?: string;
facebook?: string;
website?: string;
referenceUrl?: string;
wantsCareerTab?: boolean;
```

### 4b. Doplnit do `buildSubmissionPrompt`

- **Kontakt** — přidat Společnost a WhatsApp:
  ```ts
  ["Společnost", submission.companyName],
  ["WhatsApp", submission.whatsapp],
  ```
- **Profil** — přidat Motto (ideálně jako první pole sekce, nad Důvody):
  ```ts
  ["Motto", submission.motto],
  ```
- **Nová sekce za „Profil"** (před „Vizitka"), socials + zájem o Spolupráci:
  ```ts
  // Sociální sítě a reference
  const socialFields: [string, string | undefined][] = [
    ["Instagram", submission.instagram],
    ["LinkedIn", submission.linkedin],
    ["Facebook", submission.facebook],
    ["Web", submission.website],
    ["Reference", submission.referenceUrl],
    ["Zájem o sekci Spolupráce", submission.wantsCareerTab ? "Ano" : undefined],
  ];
  if (socialFields.some(([, v]) => v)) {
    lines.push("## Sociální sítě a reference");
    for (const [label, value] of socialFields) addField(label, value);
    lines.push("");
  }
  ```

> `addField` už prázdné hodnoty přeskakuje, takže nevyplněná pole se do promptu nedostanou. To je v souladu s úvodní instrukcí promptu („Co není vyplněné, vynech").

---

## Quality loop (povinné)

1. `npm run lint` čistý.
2. `npm run build` čistý (chytí typové chyby — hlavně nesoulad mezi interface `Submission`, `SubmissionData` a mapováním v route).
3. **Ověření v prohlížeči** — otevřít stránku **Podklady**, rozkliknout podklad, který má nová pole vyplněná (případně vytvořit testovací přes web formulář), a zkontrolovat:
   - nová pole se zobrazí v detailu,
   - tlačítko „Kopírovat pro AI" je obsahuje ve výstupu.
4. Ověřit, že **starší podklady bez nových polí** se stále načtou bez chyby (optional pole).
5. Zápis progresu do `spec/plans/work-log.md`.
6. Commit se schválením (ukázat diff → schválení → commit). Nepushovat na chráněné větve (`main`, `devel`).

> Commit: jde o interní nástroj CRM, ne o veřejný produkt DBC. Commit message **bez** `[changelog]` tagu, např. `feat: podklady – nová pole z formuláře vizitky (firma, socials, motto, career)`.
