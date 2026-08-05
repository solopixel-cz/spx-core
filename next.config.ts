import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev přes vlastní hostname (Docker → http://spx.core) je pro Next.js
  // cross-origin; bez tohohle blokuje HMR/_next assety a stránka se nezhydratuje.
  allowedDevOrigins: ["spx.core"],
};

export default nextConfig;
