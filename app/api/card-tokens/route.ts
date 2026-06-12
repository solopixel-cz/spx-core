import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import { logActivity } from "@/lib/activity";

// GET /api/card-tokens?clientId=xxx — get existing tokens for a client
export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "clientId je povinné" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const snapshot = await db
      .collection("card-tokens")
      .where("clientId", "==", clientId)
      .get();

    const tokens = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      usedAt: doc.data().usedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json(tokens);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/card-tokens — generate a new token for a client
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { clientId, name, email } = (await request.json()) as {
      clientId: string;
      name: string;
      email: string;
    };

    if (!clientId || !name || !email) {
      return NextResponse.json(
        { error: "clientId, name a email jsou povinné" },
        { status: 400 }
      );
    }

    const token = nanoid(21);
    const db = getAdminFirestore();

    await db.collection("card-tokens").doc(token).set({
      email,
      name,
      clientId,
      createdAt: FieldValue.serverTimestamp(),
    });

    await logActivity({
      entityType: "client",
      entityId: clientId,
      kind: "system",
      text: "Vygenerován formulář podkladů",
      actorUid: user.uid,
    });

    return NextResponse.json({ token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
