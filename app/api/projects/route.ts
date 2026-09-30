import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { projectFormSchema } from "@/lib/schemas/project";
import { projectStatus } from "@/lib/status";
import { logActivity } from "@/lib/activity";
import { canAccessClient, projectDates } from "@/lib/projects";

// POST /api/projects — nová jednorázová zakázka klienta
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { clientId, ...rest } = body as { clientId?: string } & Record<string, unknown>;
    if (!clientId) {
      return NextResponse.json({ error: "clientId je povinné" }, { status: 400 });
    }
    const data = projectFormSchema.parse(rest);

    const db = getAdminFirestore();
    if (!(await canAccessClient(db, clientId, user))) {
      return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
    }

    const docRef = await db.collection("projects").add({
      clientId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      status: data.status,
      price: data.price ?? null,
      ...projectDates(data.dueAt, data.status, null),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    await logActivity({
      entityType: "client",
      entityId: clientId,
      kind: "system",
      text: `Zakázka „${data.title.trim()}" přidána (${projectStatus[data.status].label})`,
      actorUid: user.uid,
    });

    revalidatePath(`/clients/${clientId}`);
    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
