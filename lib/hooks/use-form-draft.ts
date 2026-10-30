"use client";

import { useEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

const PREFIX = "spx-draft:";

interface StoredDraft<T, E> {
  values: Partial<T>;
  extra?: E;
  savedAt: number;
}

/** Koncepty starší než týden se ignorují (a smažou). */
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function read<T, E>(key: string): StoredDraft<T, E> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StoredDraft<T, E>;
    if (!draft?.savedAt || Date.now() - draft.savedAt > MAX_AGE) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

/** Smaže uložený koncept (po úspěšném uložení formuláře). */
export function clearFormDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // úložiště nedostupné, není co mazat
  }
}

/**
 * Průběžně ukládá rozepsaný formulář do localStorage a po znovunačtení stránky
 * (Safari, uspaná záložka, nová verze aplikace) ho vrátí zpět. Ukládá se jen
 * po první ruční změně (ne při programovém předvyplnění), se zpožděním 400 ms. `extra` = stav mimo react-hook-form
 * (např. seznam odkazů). Po odeslání volej `clearFormDraft(key)`.
 */
export function useFormDraft<T extends FieldValues, E = undefined>({
  key,
  form,
  enabled = true,
  extra,
  onRestoreExtra,
}: {
  key: string;
  form: Pick<UseFormReturn<T>, "watch" | "reset" | "getValues">;
  enabled?: boolean;
  extra?: E;
  onRestoreExtra?: (extra: E) => void;
}) {
  const restored = useRef(false);
  // Ukládá se až po první ruční změně (psaní do pole, stav mimo formulář).
  // Programové setValue při načtení (výpočty, předvyplnění) koncept nezakládá.
  const touched = useRef(false);
  const extraRef = useRef(extra);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { watch, reset, getValues } = form;

  const save = () => {
    if (!touched.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        const draft: StoredDraft<T, E> = {
          values: getValues(),
          extra: extraRef.current,
          savedAt: Date.now(),
        };
        localStorage.setItem(PREFIX + key, JSON.stringify(draft));
      } catch {
        // plné nebo zakázané úložiště, formulář funguje i bez konceptu
      }
    }, 400);
  };

  // Obnovení konceptu při prvním vykreslení.
  useEffect(() => {
    if (!enabled || restored.current) return;
    restored.current = true;
    const draft = read<T, E>(key);
    if (!draft) return;
    touched.current = true;
    reset({ ...getValues(), ...draft.values });
    if (draft.extra !== undefined) onRestoreExtra?.(draft.extra);
    // Až po mountu <Toaster> (je v layoutu za obsahem), jinak se hláška ztratí.
    setTimeout(() => {
      toast("Obnoven rozepsaný koncept", {
        action: {
          label: "Zahodit",
          onClick: () => {
            clearFormDraft(key);
            window.location.reload();
          },
        },
      });
    }, 0);
    // Jen jednou při mountu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ukládání při změně polí formuláře.
  useEffect(() => {
    if (!enabled) return;
    const sub = watch((_values, { type }) => {
      if (type === "change") touched.current = true;
      save();
    });
    return () => {
      sub.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  // Ukládání při změně stavu mimo formulář. Při mountu ne, jinak by
  // nedotčený formulář uložil prázdný koncept.
  const extraMounted = useRef(false);
  useEffect(() => {
    extraRef.current = extra;
    if (!extraMounted.current) {
      extraMounted.current = true;
      return;
    }
    if (!enabled) return;
    touched.current = true;
    save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extra]);
}
