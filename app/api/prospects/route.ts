import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { prospectFormSchema } from "@/lib/schemas/prospect";
import { logActivity } from "@/lib/activity";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab"); // "free", "mine", "all"
    const status = searchParams.get("status");
    const ownerUid = searchParams.get("ownerUid");
    const city = searchParams.get("city");
    const cursor = searchParams.get("cursor");
    const limit = 50;

    const db = getAdminFirestore();
    let query = db.collection("prospects")
      .orderBy("createdAt", "desc") as FirebaseFirestore.Query;

    // Tab-based filtering
    if (tab === "free") {
      query = db.collection("prospects")
        .where("ownerUid", "==", null)
        .orderBy("createdAt", "desc");
    } else if (tab === "mine" && ownerUid) {
      query = db.collection("prospects")
        .where("ownerUid", "==", ownerUid)
        .orderBy("createdAt", "desc");
    }

    if (cursor) {
      const cursorDoc = await db.collection("prospects").doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    query = query.limit(limit * 2);

    const snapshot = await query.get();
    const nonDeletedDocs = snapshot.docs.filter((d) => !d.data().deletedAt);
    const docs = nonDeletedDocs.slice(0, limit);
    const hasMore = nonDeletedDocs.length > limit;
    const nextCursor = hasMore ? docs[docs.length - 1]?.id : null;

    let prospects = docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name,
        company: d.company ?? null,
        email: d.email ?? null,
        phone: d.phone ?? null,
        city: d.city ?? null,
        portalUrl: d.portalUrl ?? null,
        demoUrl: d.demoUrl ?? null,
        status: d.status,
        ownerUid: d.ownerUid ?? null,
        leadId: d.leadId ?? null,
        source: d.source,
        importBatchId: d.importBatchId ?? null,
        claimedAt: serializeTimestamp(d.claimedAt),
        lastTouchAt: serializeTimestamp(d.lastTouchAt),
        nextFollowUpAt: serializeTimestamp(d.nextFollowUpAt),
        wasCalled: !!d.wasCalled,
        createdAt: serializeTimestamp(d.createdAt),
        updatedAt: serializeTimestamp(d.updatedAt),
      };
    });

    // Client-side filters for status and city (Firestore doesn't allow multiple inequality/in filters easily)
    if (status && status !== "all") {
      prospects = prospects.filter((p) => p.status === status);
    }
    if (city && city !== "all") {
      prospects = prospects.filter((p) => p.city === city);
    }

    return NextResponse.json({ prospects, nextCursor, hasMore });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = prospectFormSchema.parse(body);

    const db = getAdminFirestore();

    // Dedup check
    if (data.email) {
      const existing = await db
        .collection("prospects")
        .where("email", "==", data.email)
        .limit(1)
        .get();
      if (!existing.empty) {
        return NextResponse.json(
          { error: `Prospekt s e-mailem ${data.email} již existuje` },
          { status: 409 }
        );
      }
    } else if (data.name) {
      // Match by name + company
      let q = db.collection("prospects").where("name", "==", data.name);
      if (data.company) {
        q = q.where("company", "==", data.company);
      }
      const existing = await q.limit(1).get();
      if (!existing.empty) {
        return NextResponse.json(
          { error: `Prospekt „${data.name}" již existuje` },
          { status: 409 }
        );
      }
    }

    const docRef = await db.collection("prospects").add({
      ...data,
      email: data.email || null,
      portalUrl: data.portalUrl || null,
      demoUrl: data.demoUrl || null,
      status: "new",
      ownerUid: null,
      claimedAt: null,
      lastTouchAt: null,
      nextFollowUpAt: null,
      leadId: null,
      source: "manual",
      importBatchId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    await logActivity({
      entityType: "prospect",
      entityId: docRef.id,
      kind: "system",
      text: `Prospekt „${data.name}" vytvořen ručně`,
      actorUid: user.uid,
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
