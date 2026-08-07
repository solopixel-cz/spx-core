"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

interface RefreshContextValue {
  /** Zvýší se při každém kliknutí na globální Obnovit — sledují ho `useRefresh`. */
  nonce: number;
  /** Krátký příznak pro spinner na tlačítku. */
  isRefreshing: boolean;
  refresh: () => void;
}

const RefreshContext = createContext<RefreshContextValue | null>(null);

/**
 * Globální „Obnovit" napříč CRM.
 *
 * `refresh()` udělá dvě věci:
 *  - `router.refresh()` — obnoví server-rendered seznamy (čtou props ze serveru
 *    přímo, nebo je resyncují z `initial*` props),
 *  - zvýší `nonce` — klientské seznamy, které si data fetchují samy, na to
 *    reagují přes `useRefresh(fetchFn)`.
 */
export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [nonce, setNonce] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    setNonce((n) => n + 1);
    router.refresh();
    setIsRefreshing(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Refetche běží asynchronně a nezávisle — spinner ukážeme jen nakrátko.
    timeoutRef.current = setTimeout(() => setIsRefreshing(false), 600);
  }, [router]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <RefreshContext.Provider value={{ nonce, isRefreshing, refresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

/** Pro tlačítko v topbaru. */
export function useRefreshControls() {
  const ctx = useContext(RefreshContext);
  if (!ctx) {
    throw new Error("useRefreshControls musí být uvnitř <RefreshProvider>");
  }
  return { refresh: ctx.refresh, isRefreshing: ctx.isRefreshing };
}

/**
 * Spustí `callback` pokaždé, když uživatel klikne na globální Obnovit
 * (ne při prvním mountu). Pro seznamy, které si data fetchují na klientovi.
 */
export function useRefresh(callback: () => void) {
  const ctx = useContext(RefreshContext);
  const nonce = ctx?.nonce ?? 0;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    callback();
    // Cíleně jen na změnu nonce; callback je stabilní (useCallback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
}
