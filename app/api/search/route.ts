import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSalesClientIds } from "@/lib/sales-clients";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").toLowerCase().trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ clients: [], tickets: [], prospects: [] });
    }

    const db = getAdminFirestore();
    const [clientsSnap, ticketsSnap, prospectsSnap] = await Promise.all([
      db.collection("clients").get(),
      db.collection("tickets").get(),
      db.collection("prospects").get(),
    ]);

    const ownedClientIds = await getSalesClientIds(user.uid, user.role);

    const clients = clientsSnap.docs
      .filter((doc) => {
        if (doc.data().deletedAt) return false;
        if (ownedClientIds && !ownedClientIds.has(doc.id)) return false;
        const d = doc.data();
        return (
          (d.name as string).toLowerCase().includes(q) ||
          (d.company as string | undefined)?.toLowerCase().includes(q) ||
          (d.contactName as string | undefined)?.toLowerCase().includes(q) ||
          (d.email as string).toLowerCase().includes(q)
        );
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
        return (d.title as string).toLowerCase().includes(q);
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
        return (
          (d.name as string).toLowerCase().includes(q) ||
          (d.company as string | undefined)?.toLowerCase().includes(q) ||
          (d.city as string | undefined)?.toLowerCase().includes(q)
        );
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
