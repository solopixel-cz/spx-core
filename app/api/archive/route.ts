import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  archiveDocument,
  restoreDocument,
  cascadeArchiveClient,
  checkDeleteConstraints,
  permanentlyDelete,
} from "@/lib/archive";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

const validCollections = ["clients", "instances", "leads", "tickets", "prospects"];
const entityTypeMap: Record<string, "client" | "lead" | "ticket" | "prospect"> = {
  clients: "client",
  leads: "lead",
  tickets: "ticket",
  prospects: "prospect",
};

// GET /api/archive — list archived records
export async function GET() {
  try {
    await requireRole("admin", "member");
    const db = getAdminFirestore();

    const results: Array<{
      id: string;
      collection: string;
      name: string;
      deletedAt: string | null;
      deletedBy: string | null;
    }> = [];

    // Fetch users for name lookup
    const usersSnap = await db.collection("users").get();
    const userMap: Record<string, string> = {};
    usersSnap.docs.forEach((doc) => {
      userMap[doc.id] = doc.data().displayName as string;
    });

    for (const col of validCollections) {
      const snap = await db.collection(col).get();
      snap.docs.forEach((doc) => {
        const d = doc.data();
        if (!d.deletedAt) return;
        const name = (d.name ?? d.title ?? d.domain ?? doc.id) as string;
        results.push({
          id: doc.id,
          collection: col,
          name,
          deletedAt: serializeTimestamp(d.deletedAt),
          deletedBy: d.deletedBy ? (userMap[d.deletedBy as string] ?? d.deletedBy) : null,
        });
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/archive — archive, restore, or permanently delete
export async function POST(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const body = await request.json();
    const { action, collection, id, reason } = body as {
      action: "archive" | "restore" | "delete";
      collection: string;
      id: string;
      reason?: string;
    };

    if (!validCollections.includes(collection)) {
      return NextResponse.json({ error: "Neplatná kolekce" }, { status: 400 });
    }

    if (action === "archive") {
      const entityType = entityTypeMap[collection];
      if (!entityType) {
        // instances don't have their own entityType in activity — use system
        const db = getAdminFirestore();
        const docRef = db.collection(collection).doc(id);
        const doc = await docRef.get();
        if (!doc.exists) return NextResponse.json({ error: "Záznam nenalezen" }, { status: 404 });

        const { FieldValue } = await import("firebase-admin/firestore");
        await docRef.update({
          deletedAt: FieldValue.serverTimestamp(),
          deletedBy: user.uid,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await archiveDocument(collection, id, user.uid, entityType, reason);
      }

      // Cascade for clients
      let cascaded: string[] = [];
      if (collection === "clients") {
        cascaded = await cascadeArchiveClient(id, user.uid);
      }

      revalidatePath("/prospekti");
      revalidatePath("/klienti");
      return NextResponse.json({ status: "ok", cascaded });
    }

    if (action === "restore") {
      const entityType = entityTypeMap[collection];
      if (!entityType) {
        const db = getAdminFirestore();
        const { FieldValue } = await import("firebase-admin/firestore");
        await db.collection(collection).doc(id).update({
          deletedAt: FieldValue.delete(),
          deletedBy: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await restoreDocument(collection, id, user.uid, entityType);
      }
      revalidatePath("/prospekti");
      revalidatePath("/klienti");
      return NextResponse.json({ status: "ok" });
    }

    if (action === "delete") {
      // Only admin can permanently delete
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Jen administrátor může trvale mazat" }, { status: 403 });
      }

      // Must be archived first
      const db = getAdminFirestore();
      const doc = await db.collection(collection).doc(id).get();
      if (!doc.exists) return NextResponse.json({ error: "Záznam nenalezen" }, { status: 404 });
      if (!doc.data()?.deletedAt) {
        return NextResponse.json({ error: "Záznam musí být nejdříve archivován" }, { status: 400 });
      }

      // Check constraints
      const constraint = await checkDeleteConstraints(collection, id);
      if (constraint) {
        return NextResponse.json({ error: constraint }, { status: 409 });
      }

      await permanentlyDelete(collection, id);
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
