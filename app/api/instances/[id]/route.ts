import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { instanceFormSchema } from "@/lib/schemas/instance";
import { logActivity } from "@/lib/activity";

// PATCH /api/instances/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = instanceFormSchema.partial().parse(body);

    const db = getAdminFirestore();
    const docRef = db.collection("instances").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        { error: "Instance nenalezena" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (data.features !== undefined) {
      updates.features = data.features
        ? data.features
            .split(",")
            .map((f: string) => f.trim())
            .filter(Boolean)
        : [];
    }

    if (data.repoUrl === "") updates.repoUrl = null;
    if (data.deployUrl === "") updates.deployUrl = null;

    await docRef.update(updates);

    const clientId = existing.data()?.clientId;
    if (clientId) {
      await logActivity({
        entityType: "client",
        entityId: clientId,
        kind: "system",
        text: `Instance „${existing.data()?.domain}" aktualizována`,
        actorUid: user.uid,
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
