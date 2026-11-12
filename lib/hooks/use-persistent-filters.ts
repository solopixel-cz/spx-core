"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const PREFIX = "spx-filters:";

/** Vrací `false`, pokud hodnota už neexistuje (smazaný klient, deaktivovaný řešitel). */
type Validator = (value: string) => boolean;

interface Resolved<K extends string> {
  values: Record<K, string>;
  /** Filtry zahozené při obnovení, protože jejich hodnota už neplatí. */
  dropped: K[];
}

function readStored(key: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    // privátní okno, zakázané úložiště nebo poškozený obsah — jedeme na výchozích hodnotách
    return null;
  }
}

function writeStored(key: string, values: Record<string, string>) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(values));
  } catch {
    // úložiště nedostupné — filtry fungují, jen nepřežijí refresh
  }
}

/**
 * Zapamatovaný stav filtrů nad seznamem. Stav žije v URL (jde poslat odkazem,
 * každá záložka má svůj) a zároveň v localStorage pod `storageKey` (výchozí
 * hodnota při příchodu na stránku bez parametrů). **URL má přednost**, uložený
 * stav se použije jen pro parametry, které v URL nejsou.
 *
 * Do URL se píše přes History API (`replaceState`) — adresa se mění bez dotazu
 * na server, takže filtrování zůstává okamžité a historie prohlížeče se neplní
 * každým kliknutím.
 *
 * `defaults` určuje názvy parametrů v URL i hodnotu „nefiltrováno" (očekává se
 * konstanta mimo komponentu). `validate` zahodí hodnoty odkazující na záznam,
 * který už neexistuje (smazaný klient, deaktivovaný řešitel) — jinak by se po
 * refreshi otevřel prázdný seznam bez vysvětlení. Zahozené filtry vrací
 * `dropped`, aby je šlo uživateli vysvětlit.
 */
export function usePersistentFilters<K extends string>({
  storageKey,
  defaults,
  validate,
}: {
  storageKey: string;
  defaults: Record<K, string>;
  validate?: Partial<Record<K, Validator>>;
}) {
  const searchParams = useSearchParams();
  const names = Object.keys(defaults) as K[];

  /** Výchozí hodnota je platná vždy; ostatní prověří `validate`. */
  const isValid = (name: K, value: string) => {
    if (value === defaults[name]) return true;
    const check = validate?.[name];
    return check ? check(value) : true;
  };

  // Počáteční stav jen z URL — localStorage na serveru není, jeho čtení při
  // prvním vykreslení by rozbilo hydrataci.
  const [state, setState] = useState<Resolved<K>>(() => {
    const values = { ...defaults };
    const dropped: K[] = [];
    for (const name of names) {
      const raw = searchParams.get(name);
      if (!raw || raw === defaults[name]) continue;
      if (isValid(name, raw)) values[name] = raw;
      else dropped.push(name);
    }
    return { values, dropped };
  });

  function syncUrl(values: Record<K, string>) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    for (const name of names) {
      if (values[name] === defaults[name]) url.searchParams.delete(name);
      else url.searchParams.set(name, values[name]);
    }
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }

  // Obnovení z localStorage až po mountu. URL vyhrává, doplňujeme jen to,
  // co v ní není.
  useEffect(() => {
    const stored = readStored(storageKey);
    const urlParams = new URLSearchParams(window.location.search);
    const values = { ...state.values };
    const dropped = [...state.dropped];
    let changed = false;

    for (const name of names) {
      if (urlParams.get(name) !== null) continue;
      const value = stored?.[name];
      if (!value || value === values[name]) continue;
      changed = true;
      if (isValid(name, value)) values[name] = value;
      else if (!dropped.includes(name)) dropped.push(name);
    }

    if (changed) {
      // Záměrné setState v efektu: localStorage jde přečíst až na klientovi,
      // stejně jako u `useRowSelection`. Lazy init by rozbil hydrataci.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ values, dropped });
      syncUrl(values);
    }
    // Stav z odkazu se stává novým zapamatovaným stavem.
    writeStored(storageKey, values);
    // Jen jednou při mountu — později už stav drží komponenta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(name: K, value: string | null | undefined) {
    const next = { ...state.values, [name]: value ?? defaults[name] };
    syncUrl(next);
    writeStored(storageKey, next);
    // Po ruční změně filtru už není co vysvětlovat.
    setState({ values: next, dropped: [] });
  }

  function reset() {
    const next = { ...defaults };
    syncUrl(next);
    writeStored(storageKey, next);
    setState({ values: next, dropped: [] });
  }

  const active = names.some((name) => state.values[name] !== defaults[name]);

  return { values: state.values, dropped: state.dropped, set, reset, active };
}
