import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { projectFormSchema } from "@/lib/schemas/project";
import { projectStatus } from "@/lib/status";
import { logActivity } from "@/lib/activity";
import { canAccessClient, projectDates } from "@/lib/projects";

// PATCH /api/projects/[id] — úprava zakázky / změna stavu
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const data = projectFormSchema.partial().parse(await request.json());

    const db = getAdminFirestore();
    const docRef = db.collection("projects").doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: "Zakázka nenalezena" }, { status: 404 });
    }
    const prev = existing.data()!;
    const clientId = prev.clientId as string;
    if (!(await canAccessClient(db, clientId, user))) {
      return NextResponse.json({ error: "Zakázka nenalezena" }, { status: 404 });
    }

    const prevStatus = prev.status as string;
    const status = data.status ?? prevStatus;
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      ...projectDates(data.dueAt, status, prevStatus),
    };
    if (data.title !== undefined) updates.title = data.title.trim();
    if (data.description !== undefined) updates.description = data.description.trim() || null;
    if (data.status !== undefined) updates.status = data.status;
    if (data.price !== undefined) updates.price = data.price;

    await docRef.update(updates);

    await logActivity({
      entityType: "client",
      entityId: clientId,
      kind: "system",
      text:
        data.status && data.status !== prevStatus
          ? `Zakázka „${prev.title}": ${projectStatus[prevStatus]?.label ?? prevStatus} → ${projectStatus[data.status].label}`
          : `Zakázka „${prev.title}" upravena`,
      actorUid: user.uid,
    });

    revalidatePath(`/clients/${clientId}`);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
