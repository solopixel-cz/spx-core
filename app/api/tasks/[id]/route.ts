import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const db = getAdminFirestore();
    const updates: Record<string, unknown> = {
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.dueAt) {
      updates.dueAt = new Date(body.dueAt);
    }

    await db.collection("tasks").doc(id).update(updates);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
