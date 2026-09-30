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

const validCollections = ["clients", "instances", "tickets", "prospects", "projects"];
const entityTypeMap: Record<string, "client" | "ticket" | "prospect"> = {
  clients: "client",
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

const MAX_BULK = 200;

async function archiveOne(collection: string, id: string, uid: string, reason?: string) {
  const entityType = entityTypeMap[collection];
  if (!entityType) {
    // instances don't have their own entityType in activity — use system
    const db = getAdminFirestore();
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error("Záznam nenalezen");

    const { FieldValue } = await import("firebase-admin/firestore");
    await docRef.update({
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await archiveDocument(collection, id, uid, entityType, reason);
  }

  // Cascade for clients
  return collection === "clients" ? await cascadeArchiveClient(id, uid) : [];
}

async function restoreOne(collection: string, id: string, uid: string) {
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
    await restoreDocument(collection, id, uid, entityType);
  }
}

// POST /api/archive — archive, restore, or permanently delete
// `ids` (pole) = hromadná archivace / obnova; `id` = jeden záznam.
export async function POST(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const body = await request.json();
    const { action, collection, id, ids, reason } = body as {
      action: "archive" | "restore" | "delete";
      collection: string;
      id?: string;
      ids?: string[];
      reason?: string;
    };

    if (!validCollections.includes(collection)) {
      return NextResponse.json({ error: "Neplatná kolekce" }, { status: 400 });
    }

    if (action === "archive" || action === "restore") {
      const bulk = Array.isArray(ids);
      const targets = bulk ? ids : id ? [id] : [];
      if (targets.length === 0) {
        return NextResponse.json({ error: "Chybí záznam" }, { status: 400 });
      }
      if (targets.length > MAX_BULK) {
        return NextResponse.json({ error: `Najednou lze zpracovat max. ${MAX_BULK} záznamů` }, { status: 400 });
      }

      const done: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];
      const cascaded: string[] = [];

      // Sekvenčně — kaskáda klienta zapisuje do dalších kolekcí.
      for (const targetId of targets) {
        try {
          if (action === "archive") {
            cascaded.push(...(await archiveOne(collection, targetId, user.uid, reason)));
          } else {
            await restoreOne(collection, targetId, user.uid);
          }
          done.push(targetId);
        } catch (err) {
          failed.push({ id: targetId, error: err instanceof Error ? err.message : "Chyba" });
        }
      }

      revalidatePath("/prospects");
      revalidatePath("/clients");
      revalidatePath("/tickets");

      // Jeden záznam (`id`) — původní chování: chyba = 400.
      if (!bulk && failed.length > 0) {
        return NextResponse.json({ error: failed[0].error }, { status: 400 });
      }
      return NextResponse.json({ status: "ok", done, failed, cascaded });
    }

    if (action === "delete") {
      if (!id) return NextResponse.json({ error: "Chybí záznam" }, { status: 400 });
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
