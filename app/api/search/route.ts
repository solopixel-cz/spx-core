import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSalesClientIds } from "@/lib/sales-clients";

/** Bez diakritiky a velikosti písmen: „stiborova“ najde „Stiborová“. */
function norm(value: unknown): string {
  return typeof value === "string" ? value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase() : "";
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = norm((searchParams.get("q") ?? "").trim());

    if (!q || q.length < 2) {
      return NextResponse.json({ clients: [], tickets: [], prospects: [] });
    }

    const db = getAdminFirestore();
    const [clientsSnap, ticketsSnap, prospectsSnap, instancesSnap] = await Promise.all([
      db.collection("clients").get(),
      db.collection("tickets").get(),
      db.collection("prospects").get(),
      db.collection("instances").get(),
    ]);

    // Adresy vizitek a webů klienta: klienta najde i doména („lukas-kaleta.cz“).
    const hostsByClient = new Map<string, string[]>();
    for (const doc of instancesSnap.docs) {
      const d = doc.data();
      if (d.deletedAt) continue;
      const hosts = hostsByClient.get(d.clientId as string) ?? [];
      hosts.push(...[d.domain, d.primaryHost, ...((d.hostnames as string[] | undefined) ?? [])].map(norm));
      hostsByClient.set(d.clientId as string, hosts);
    }

    const ownedClientIds = await getSalesClientIds(user.uid, user.role);

    const clients = clientsSnap.docs
      .filter((doc) => {
        if (doc.data().deletedAt) return false;
        if (ownedClientIds && !ownedClientIds.has(doc.id)) return false;
        const d = doc.data();
        return [d.name, d.company, d.contactName, d.email].some((v) => norm(v).includes(q)) ||
          (hostsByClient.get(doc.id) ?? []).some((h) => h.includes(q));
      })
      .slice(0, 5)
      .map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        // U firmy ukázat pod názvem kontaktní osobu (pole company se u firmy nepoužívá).
        company: doc.data().kind === "company" ? doc.data().contactName : doc.data().company,
      }));

    const tickets = ticketsSnap.docs
      .filter((doc) => {
        if (doc.data().deletedAt) return false;
        if (ownedClientIds && !ownedClientIds.has(doc.data().clientId as string)) return false;
        const d = doc.data();
        return norm(d.title).includes(q);
      })
      .slice(0, 5)
      .map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        status: doc.data().status,
      }));

    const prospects = prospectsSnap.docs
      .filter((doc) => {
        if (doc.data().deletedAt) return false;
        const d = doc.data();
        return [d.name, d.company, d.city].some((v) => norm(v).includes(q));
      })
      .slice(0, 5)
      .map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        company: doc.data().company,
        status: doc.data().status,
      }));

    return NextResponse.json({ clients, tickets, prospects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
