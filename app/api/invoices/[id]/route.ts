import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activity";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = (await request.json()) as { action: string };

    const db = getAdminFirestore();
    const docRef = db.collection("invoices").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 });
    }

    const data = doc.data()!;

    if (body.action === "paid") {
      await docRef.update({
        status: "paid",
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await logActivity({
        entityType: "invoice",
        entityId: id,
        kind: "status_change",
        text: `Faktura ${data.number} zaplacena`,
        actorUid: user.uid,
      });
    } else if (body.action === "cancelled") {
      await docRef.update({
        status: "cancelled",
        updatedAt: FieldValue.serverTimestamp(),
      });
      await logActivity({
        entityType: "invoice",
        entityId: id,
        kind: "status_change",
        text: `Faktura ${data.number} stornována`,
        actorUid: user.uid,
      });
    } else {
      return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
