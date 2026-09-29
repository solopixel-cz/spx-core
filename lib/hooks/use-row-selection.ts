"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Multiselect řádků v seznamu. Výběr se vždy počítá jen z aktuálně
 * viditelných řádků (`visibleIds`) — když filtr řádek skryje, nezůstane
 * „neviditelně" vybraný pro hromadnou akci.
 *
 * `storageKey` = výběr se drží v sessionStorage, takže přežije odchod
 * na detail a návrat zpět (a reload v rámci záložky).
 */
export function useRowSelection(visibleIds: string[], storageKey?: string) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(!storageKey);

  // Obnova až po mountu (sessionStorage na serveru není) — setState v effectu
  // je tu záměrný, lazy init by rozbil hydrataci.
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = sessionStorage.getItem(`selection:${storageKey}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !hydrated) return;
    try {
      if (selected.size === 0) sessionStorage.removeItem(`selection:${storageKey}`);
      else sessionStorage.setItem(`selection:${storageKey}`, JSON.stringify([...selected]));
    } catch {
      // ignore
    }
  }, [selected, storageKey, hydrated]);

  const selectedIds = useMemo(
    () => visibleIds.filter((id) => selected.has(id)),
    [visibleIds, selected]
  );

  const allSelected = visibleIds.length > 0 && selectedIds.length === visibleIds.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(visibleIds));
  }, [allSelected, visibleIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  return { selectedIds, allSelected, someSelected, isSelected, toggle, toggleAll, clear };
}

export type RowSelection = ReturnType<typeof useRowSelection>;
