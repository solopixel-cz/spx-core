import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kořen workspace explicitně = tato složka. Jinak Next.js kvůli druhému
  // lockfile v ~/ (home) chybně zvolí root a rozbije se Turbopack/RSC manifest
  // („Manifest file is empty", „Could not find … global-error.js").
  turbopack: {
    root: import.meta.dirname,
  },
  outputFileTracingRoot: import.meta.dirname,
  // Dev přes vlastní hostname (Docker → http://spx.core) je pro Next.js
  // cross-origin; bez tohohle blokuje HMR/_next assety a stránka se nezhydratuje.
  allowedDevOrigins: ["spx.core"],
  // react-pdf obsahuje nativní/wasm závislosti (yoga) — nebundlovat.
  serverExternalPackages: ["@react-pdf/renderer"],
  // TTF fonty pro generování PDF faktur (react-pdf) — Vercel je jinak
  // do serverless bundlu nezabalí, protože se čtou přes fs za běhu.
  outputFileTracingIncludes: {
    "/api/invoices/**": ["./assets/fonts/**"],
  },
  // Service worker se NIKDY nesmí servírovat z HTTP cache — jinak prohlížeč
  // nezaznamená novou verzi (a s ní purge starých cache) klidně 24 h. Manifest
  // stejně tak. Statika pod /_next/ je hashovaná, tu Next cachuje sám jako immutable.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
  // Přejmenování českých routů na anglické — staré URL (záložky, už odeslané
  // push notifikace a e-maily s odkazy) přesměrujeme na nové. Konkrétní podcesty
  // musí být PŘED obecným :path*.
  async redirects() {
    return [
      // settings + podcesty s vlastním překladem
      { source: "/nastaveni/archiv", destination: "/settings/archive", permanent: true },
      { source: "/nastaveni/fakturacni-udaje", destination: "/settings/billing-details", permanent: true },
      { source: "/nastaveni/notifikace", destination: "/settings/notifications", permanent: true },
      { source: "/nastaveni/sablony", destination: "/settings/templates", permanent: true },
      { source: "/nastaveni/uzivatele", destination: "/settings/users", permanent: true },
      { source: "/nastaveni/:path*", destination: "/settings/:path*", permanent: true },
      // invoices + podcesty s vlastním překladem
      { source: "/fakturace/nova", destination: "/invoices/new", permanent: true },
      { source: "/fakturace/:id/upravit", destination: "/invoices/:id/edit", permanent: true },
      { source: "/fakturace/:path*", destination: "/invoices/:path*", permanent: true },
      // přímé 1:1 překlady (i s dynamickými podcestami)
      { source: "/aktivita/:path*", destination: "/activity/:path*", permanent: true },
      { source: "/leady/:path*", destination: "/leads/:path*", permanent: true },
      { source: "/prospekti/:path*", destination: "/prospects/:path*", permanent: true },
      { source: "/klienti/:path*", destination: "/clients/:path*", permanent: true },
      { source: "/moje-vizitky/:path*", destination: "/my-cards/:path*", permanent: true },
      { source: "/podklady/:path*", destination: "/submissions/:path*", permanent: true },
      { source: "/ukoly/:path*", destination: "/tasks/:path*", permanent: true },
      { source: "/tickety/:path*", destination: "/tickets/:path*", permanent: true },
      { source: "/provize/:path*", destination: "/commissions/:path*", permanent: true },
      { source: "/profil/:path*", destination: "/profile/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
