import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
