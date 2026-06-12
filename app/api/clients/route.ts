import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { clientFormSchema } from "@/lib/schemas/client";
import { logActivity } from "@/lib/activity";

// GET /api/clients
export async function GET() {
  try {
    const user = await requireAuth();
    const db = getAdminFirestore();

    const query = user.role === "sales"
      ? db.collection("clients").where("salesOwnerUid", "==", user.uid).orderBy("createdAt", "desc")
      : db.collection("clients").orderBy("createdAt", "desc");

    const snapshot = await query.get();

    const clients = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json(clients);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/clients
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = clientFormSchema.parse(body);

    const db = getAdminFirestore();
    const docRef = await db.collection("clients").add({
      ...data,
      // Auto-assign sales user as owner, ignore payload salesOwnerUid from sales
      salesOwnerUid: user.role === "sales" ? user.uid : (body.salesOwnerUid || null),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    await logActivity({
      entityType: "client",
      entityId: docRef.id,
      kind: "system",
      text: `Klient „${data.name}" vytvořen`,
      actorUid: user.uid,
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
