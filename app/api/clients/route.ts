import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { clientFormSchema } from "@/lib/schemas/client";
import { logActivity } from "@/lib/activity";

// GET /api/clients
export async function GET() {
  try {
    await requireAuth();
    const db = getAdminFirestore();
    const snapshot = await db
      .collection("clients")
      .orderBy("createdAt", "desc")
      .get();

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
