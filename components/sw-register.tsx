"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Registrace service workeru (jen v produkci — v dev by cache překážela)
 * + spolehlivý update flow, aby appka nikdy „nezůstala viset" na staré verzi:
 *  - `updateViaCache: "none"` → prohlížeč vždy revaliduje `/sw.js`, nebere ho
 *    z HTTP cache (jinak by novou verzi nemusel zaznamenat klidně 24 h).
 *  - `registration.update()` při startu, návratu na tab a jednou za hodinu —
 *    PWA v režimu standalone se nezavírá, takže bez toho by update nikdy nepřišel.
 *  - `controllerchange` → nabídka „Obnovit“ v toastu (ne automatický reload:
 *    ten v Safari mazal rozepsané formuláře). Guard `hadController` brání
 *    hlášce při úplně první instalaci SW.
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
      // Nová verze SW převzala řízení. Hláška jen pokud už dřív nějaký SW řídil
      // (tj. jde o update, ne o úplně první instalaci) a jen jednou. Obnovení
      // nechává na uživateli, aby nepřišel o rozepsaná data.
      if (!hadController || refreshing) return;
      refreshing = true;
      toast("Je dostupná nová verze CRM", {
        duration: Infinity,
        action: { label: "Obnovit", onClick: () => window.location.reload() },
      });
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
