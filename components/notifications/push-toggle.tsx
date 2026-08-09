"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type State =
  | "checking"
  | "unsupported"
  | "denied"
  | "off"
  | "on"
  | "working";

/** VAPID public klíč → Uint8Array pro pushManager.subscribe. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushToggle() {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      toast.error("Chybí VAPID klíč (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
      return;
    }
    setState("working");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error("subscribe failed");

      setState("on");
      toast.success("Notifikace na tomto zařízení jsou zapnuté.");
    } catch {
      toast.error("Zapnutí notifikací se nepodařilo.");
      setState("off");
    }
  }

  async function disable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Notifikace na tomto zařízení jsou vypnuté.");
    } catch {
      toast.error("Vypnutí se nepodařilo.");
      setState("on");
    }
  }

  if (state === "checking") {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Načítám…
      </Button>
    );
  }

  if (state === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        Tento prohlížeč push notifikace nepodporuje. Na iPhonu přidej CRM na
        plochu (Sdílet → Přidat na plochu) a otevři ho odtud.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        Notifikace jsou v prohlížeči zablokované. Povol je v nastavení prohlížeče
        (nebo v Nastavení iPhonu u této aplikace) a načti stránku znovu.
      </p>
    );
  }

  const working = state === "working";

  return state === "on" ? (
    <Button variant="outline" onClick={disable} disabled={working}>
      {working ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <BellOff className="mr-2 h-4 w-4" />
      )}
      Vypnout na tomto zařízení
    </Button>
  ) : (
    <Button onClick={enable} disabled={working}>
      {working ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Bell className="mr-2 h-4 w-4" />
      )}
      Zapnout na tomto zařízení
    </Button>
  );
}
