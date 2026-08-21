"use client";

import { useEffect } from "react";

/**
 * Registrace service workeru (jen v produkci — v dev by cache překážela)
 * + spolehlivý update flow, aby appka nikdy „nezůstala viset" na staré verzi:
 *  - `updateViaCache: "none"` → prohlížeč vždy revaliduje `/sw.js`, nebere ho
 *    z HTTP cache (jinak by novou verzi nemusel zaznamenat klidně 24 h).
 *  - `registration.update()` při startu, návratu na tab a jednou za hodinu —
 *    PWA v režimu standalone se nezavírá, takže bez toho by update nikdy nepřišel.
 *  - `controllerchange` → jednorázový reload, aby nová verze (vzhled i kód)
 *    naskočila hned, ne až po ručním zavření všech tabů. Guard `hadController`
 *    brání zbytečnému reloadu při úplně první instalaci SW.
 */
export function SwRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    const cleanup: Array<() => void> = [];

    const onControllerChange = () => {
      // Nová verze SW převzala řízení. Reload jen pokud už dřív nějaký SW řídil
      // (tj. jde o update, ne o úplně první instalaci) a jen jednou.
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    let registration: ServiceWorkerRegistration | undefined;
    const checkForUpdate = () => {
      registration?.update().catch(() => {});
    };

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
        const interval = window.setInterval(checkForUpdate, 60 * 60 * 1000);
        cleanup.push(() => window.clearInterval(interval));
      })
      .catch(() => {
        // registrace není kritická — appka funguje i bez SW
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
      document.removeEventListener("visibilitychange", onVisible);
      cleanup.forEach((fn) => fn());
    };
  }, []);

  return null;
}
