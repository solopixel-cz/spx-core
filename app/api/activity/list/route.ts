import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSalesClientIds } from "@/lib/sales-clients";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = 50;
    const isSales = user.role === "sales";

    const db = getAdminFirestore();

    // User name map
    const usersSnap = await db.collection("users").get();
    const userMap: Record<string, string> = {};
    usersSnap.docs.forEach((doc) => {
      userMap[doc.id] = doc.data().displayName as string;
    });

    const ownedClientIds = await getSalesClientIds(user.uid, user.role);

    let query = db.collection("activity").orderBy("createdAt", "desc");

    if (cursor) {
      const cursorDoc = await db.collection("activity").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    query = query.limit(limit + 1);
    const snap = await query.get();
    const docs = snap.docs.slice(0, limit);
    const hasMore = snap.docs.length > limit;

    const activities = docs
      .filter((doc) => {
        const d = doc.data();
        const et = d.entityType as string;
        if (isSales) {
          if (et === "invoice") return false;
          // Filter client/ticket activities to own clients
          if ((et === "client" || et === "ticket") && ownedClientIds) {
            return ownedClientIds.has(d.entityId as string);
          }
        }
        return true;
      })
      .map((doc) => {
        const d = doc.data();
        const et = d.entityType as string;
        const href =
          et === "client" ? `/clients/${d.entityId}`
          : et === "lead" ? "/leads"
          : et === "ticket" ? "/tickets"
          : et === "prospect" ? "/prospects"
          : "/invoices";
        return {
          id: doc.id,
          actorUid: d.actorUid as string,
          actor: userMap[d.actorUid as string] ?? "Systém",
          entityType: et,
          entityId: d.entityId as string,
          kind: d.kind as string,
          text: d.text as string,
          href,
          createdAt: serializeTimestamp(d.createdAt),
        };
      });

    return NextResponse.json({ activities, hasMore });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
