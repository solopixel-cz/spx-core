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
    const body = (await request.json()) as {
      status?: string;
      assigneeUid?: string;
      title?: string;
      description?: string;
      type?: string;
      priority?: string;
      clientId?: string;
    };

    const db = getAdminFirestore();
    const docRef = db.collection("tickets").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Ticket nenalezen" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.status) updates.status = body.status;
    if (body.assigneeUid !== undefined) updates.assigneeUid = body.assigneeUid;
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.type) updates.type = body.type;
    if (body.priority) updates.priority = body.priority;
    if (body.clientId) updates.clientId = body.clientId;

    await docRef.update(updates);

    if (body.status) {
      await logActivity({
        entityType: "ticket",
        entityId: id,
        kind: "status_change",
        text: `Stav změněn na „${body.status}"`,
        actorUid: user.uid,
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
