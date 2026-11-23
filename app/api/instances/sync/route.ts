import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { buildCardsMap, syncProjectDomains } from "@/lib/card-deploy";
import { upsertGlobalConfig, vercelConfigured } from "@/lib/vercel";

// POST /api/instances/sync — přepíše mapu vizitek v Global Config a dorovná
// domény všech vizitek v projektu (oprava po ruční změně ve Vercelu).
export async function POST() {
  try {
    await requireRole("admin");
    if (!vercelConfigured()) {
      return NextResponse.json({ error: "Vercel není napojený (chybí env)" }, { status: 400 });
    }
    const db = getAdminFirestore();
    const map = await buildCardsMap(db);

    const warnings: string[] = [];
    for (const [slug, card] of Object.entries(map.cards)) {
      const hosts = Object.keys(map.hosts).filter((h) => map.hosts[h] === slug);
      warnings.push(...(await syncProjectDomains([], hosts, card.primaryHost)));
    }
    await upsertGlobalConfig({ cards: map });

    return NextResponse.json({
      status: "ok",
      cards: Object.keys(map.cards).length,
      hosts: Object.keys(map.hosts).length,
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
