import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { ticketFormSchema } from "@/lib/schemas/ticket";
import { logActivity } from "@/lib/activity";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const db = getAdminFirestore();
    let query: FirebaseFirestore.Query = db.collection("tickets").orderBy("createdAt", "desc");

    if (clientId) {
      query = db.collection("tickets").where("clientId", "==", clientId).orderBy("createdAt", "desc");
    }

    const snapshot = await query.get();
    const tickets = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json(tickets);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = ticketFormSchema.parse(body);

    const db = getAdminFirestore();
    const docRef = await db.collection("tickets").add({
      ...data,
      links: data.links ?? [],
      status: "open",
      attachments: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    await logActivity({
      entityType: "ticket",
      entityId: docRef.id,
      kind: "system",
      text: `Ticket „${data.title}" vytvořen`,
      actorUid: user.uid,
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
