import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { logActivity } from "@/lib/activity";

// GET /api/activity?entityType=client&entityId=xxx
export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType a entityId jsou povinné" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const snapshot = await db
      .collection("activity")
      .where("entityType", "==", entityType)
      .where("entityId", "==", entityId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const activities = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json(activities);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/activity — add a note
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { entityType, entityId, text } = (await request.json()) as {
      entityType: string;
      entityId: string;
      text: string;
    };

    if (!entityType || !entityId || !text) {
      return NextResponse.json(
        { error: "entityType, entityId a text jsou povinné" },
        { status: 400 }
      );
    }

    await logActivity({
      entityType: entityType as "client" | "lead" | "ticket" | "invoice" | "prospect",
      entityId,
      kind: "note",
      text,
      actorUid: user.uid,
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
