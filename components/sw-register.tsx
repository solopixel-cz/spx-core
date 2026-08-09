"use client";

import { useEffect } from "react";

/** Registrace service workeru (jen v produkci — v dev by cache překážela). */
export function SwRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registrace není kritická — appka funguje i bez SW
    });
  }, []);

  return null;
}
