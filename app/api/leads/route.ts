import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { leadFormSchema } from "@/lib/schemas/lead";
import { logActivity } from "@/lib/activity";

export async function GET() {
  try {
    await requireAuth();
    const db = getAdminFirestore();
    const snapshot = await db.collection("leads").orderBy("updatedAt", "desc").get();

    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json(leads);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = leadFormSchema.parse(body);

    const db = getAdminFirestore();
    const docRef = await db.collection("leads").add({
      ...data,
      value: data.value || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    await logActivity({
      entityType: "lead",
      entityId: docRef.id,
      kind: "system",
      text: `Lead „${data.name}" vytvořen`,
      actorUid: user.uid,
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
