// Service worker pro SPX Core PWA.
// Strategie:
//  - /_next/static + ikony/fonty: cache-first (immutable, hashované soubory)
//  - navigace (HTML): network-first s cache fallbackem (offline + rychlý start)
//  - vše ostatní (API, RSC data-requesty, dynamická data): SW NEZASAHUJE →
//    normální síťový request. Pro živý CRM je jakékoli servírování starých dat
//    nežádoucí, proto tu ZÁMĚRNĚ není žádná stale-while-revalidate větev.
const VERSION = "spx-v3";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

// --- Web Push ---------------------------------------------------------------
// Payload posílá server (lib/push.ts) jako JSON { title, body, href }.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "SPX Core", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "SPX Core";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { href: data.href || "/" },
    })
  );
});

// Klik na notifikaci — zaostři existující okno (a naviguj) nebo otevři nové.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(href);
            } catch {
              // navigace může selhat (cross-origin apod.) — fokus stačí
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(href);
    })()
  );
});
// ---------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(VERSION))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isImmutable(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/icon.svg" ||
    /\.(woff2?|ttf|otf)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Next.js RSC / data-requesty (router.refresh, měkká navigace, prefetch) mají
  // hlavičku `RSC: 1` (příp. `?_rsc=`) a NEJSOU v módu "navigate". Nikdy je
  // necachovat — jinak by se seznamy aktualizovaly až po ručním reloadu.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    return;
  }

  // Immutable statika — cache-first
  if (isImmutable(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  // Navigace — network-first, offline fallback z cache
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const home = await caches.match("/");
          if (home) return home;
          throw new Error("offline");
        }
      })()
    );
    return;
  }

  // Vše ostatní (dynamická data, API, RSC) — SW nezasahuje, request jde na síť
  // normálně. Žádné cachování → žádná stará data.
});
