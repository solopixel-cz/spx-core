import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activity";

// PATCH /api/submissions/[id] — mark as processed
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const db = getAdminFirestore();
    await db.collection("card-submissions").doc(id).update({
      processedAt: FieldValue.serverTimestamp(),
      processedBy: user.uid,
    });

    // Find linked client via token
    const tokenDoc = await db.collection("card-tokens").doc(id).get();
    const clientId = tokenDoc.data()?.clientId;

    if (clientId) {
      await logActivity({
        entityType: "client",
        entityId: clientId,
        kind: "system",
        text: "Podklady z formuláře zpracovány",
        actorUid: user.uid,
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
