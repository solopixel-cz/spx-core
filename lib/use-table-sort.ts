"use client";

import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";
export type SortValue = string | number | Date | null | undefined;
export type SortState<K extends string> = { key: K; dir: SortDir };

const collator = new Intl.Collator("cs", { sensitivity: "base", numeric: true });

/** Porovnání pro řazení tabulek: čeština (ch, diakritika), čísla, data; prázdné vždy na konci. */
export function compareSortValues(a: SortValue, b: SortValue, dir: SortDir): number {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
  let r: number;
  if (typeof a === "string" && typeof b === "string") r = collator.compare(a, b);
  else r = Number(a instanceof Date ? a.getTime() : a) - Number(b instanceof Date ? b.getTime() : b);
  return dir === "asc" ? r : -r;
}

/**
 * Řazení tabulky na klientovi. `accessors` vrací hodnotu sloupce pro řádek,
 * `initial` je výchozí řazení (typicky abecedně podle jména / klienta).
 * Klik na stejný sloupec přepne směr, na jiný sloupec řadí vzestupně.
 */
export function useTableSort<T, K extends string>(
  rows: T[],
  accessors: Record<K, (row: T) => SortValue>,
  initial: SortState<NoInfer<K>>,
) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  const sorted = useMemo(() => {
    const get = accessors[sort.key];
    if (!get) return rows;
    // Stabilní řazení: shodné hodnoty drží původní pořadí ze serveru.
    return rows
      .map((row, i) => ({ row, i }))
      .sort((a, b) => compareSortValues(get(a.row), get(b.row), sort.dir) || a.i - b.i)
      .map((x) => x.row);
    // accessors bývají inline objekt; řadí se podle klíče, ne identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort.key, sort.dir]);

  function toggle(key: K) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return { sorted, sort, toggle };
}
