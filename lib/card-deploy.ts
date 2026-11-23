import type { Firestore } from "firebase-admin/firestore";
import {
  addProjectDomain,
  getProjectDomain,
  removeProjectDomain,
  updateProjectDomainRedirect,
  upsertGlobalConfig,
  vercelConfigured,
  VercelError,
} from "@/lib/vercel";

/**
 * Nasazení vizitek (spx-dbc v2): jeden Vercel projekt, poradce podle domény.
 * CRM je zdroj pravdy, vizitky čtou mapu z Global Config (klíč `cards`).
 */

/** Hodnota v Global Config pro jednu vizitku. */
export interface CardDeployment {
  status: string; // setup | live | maintenance | offline
  primaryHost: string | null;
  leadEmail: string | null;
  ga4MeasurementId: string | null;
  googleSiteVerification: string | null;
  frameAncestors: string[];
}

export interface CardsMap {
  hosts: Record<string, string>; // adresa → slug
  cards: Record<string, CardDeployment>; // slug → nasazení
}

/** Sestaví mapu ze všech nearchivovaných vizitek. */
export async function buildCardsMap(db: Firestore): Promise<CardsMap> {
  // Starší instance nemají `type` (= vizitka), proto bez where a filtr v paměti.
  const snap = await db.collection("instances").get();
  const map: CardsMap = { hosts: {}, cards: {} };
  for (const doc of snap.docs) {
    const d = doc.data();
    const slug = d.advisorSlug as string | undefined;
    if (d.deletedAt || !slug || (d.type ?? "card") !== "card") continue;
    const hostnames = (d.hostnames as string[] | undefined) ?? [];
    for (const h of hostnames) map.hosts[h] = slug;
    map.cards[slug] = {
      status: (d.status as string) ?? "setup",
      primaryHost: (d.primaryHost as string | undefined) ?? hostnames[0] ?? null,
      leadEmail: (d.leadEmail as string | undefined) ?? null,
      ga4MeasurementId: (d.ga4MeasurementId as string | undefined) ?? null,
      googleSiteVerification: (d.googleSiteVerification as string | undefined) ?? null,
      frameAncestors: (d.frameAncestors as string[] | undefined) ?? [],
    };
  }
  return map;
}

/** Přepíše mapu v Global Config. Bez env nic nedělá a vrátí false. */
export async function syncCardsConfig(db: Firestore): Promise<boolean> {
  if (!vercelConfigured()) return false;
  await upsertGlobalConfig({ cards: await buildCardsMap(db) });
  return true;
}

/** Totéž, ale chyba se jen zaloguje (volá se po běžném uložení instance). */
export async function syncCardsConfigQuietly(db: Firestore) {
  try {
    await syncCardsConfig(db);
  } catch (e) {
    console.error("[card-deploy] sync Global Config selhal", e);
  }
}

function domainError(host: string, e: unknown): string {
  if (e instanceof VercelError && e.status === 409) {
    return `${host}: doména je ještě v jiném Vercel projektu (stará vizitka), odeberte ji tam a uložte znovu`;
  }
  return `${host}: ${e instanceof Error ? e.message : "chyba Vercelu"}`;
}

/**
 * Srovná domény v projektu vizitek: přidá nové, odebere zrušené a vedlejší
 * adresy přesměruje (308) na hlavní. Vrací varování pro UI.
 */
export async function syncProjectDomains(
  before: string[],
  after: string[],
  primaryHost: string | null
): Promise<string[]> {
  if (!vercelConfigured()) return [];
  const warnings: string[] = [];

  for (const host of before.filter((h) => !after.includes(h))) {
    try {
      await removeProjectDomain(host);
    } catch (e) {
      warnings.push(domainError(host, e));
    }
  }

  for (const host of after) {
    const redirect = primaryHost && host !== primaryHost ? primaryHost : null;
    try {
      const existing = await getProjectDomain(host);
      if (!existing) await addProjectDomain(host, redirect);
      else if ((existing.redirect ?? null) !== redirect) await updateProjectDomainRedirect(host, redirect);
    } catch (e) {
      warnings.push(domainError(host, e));
    }
  }

  return warnings;
}
