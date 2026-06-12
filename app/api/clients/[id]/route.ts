import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { clientFormSchema } from "@/lib/schemas/client";
import { logActivity } from "@/lib/activity";

// GET /api/clients/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getAdminFirestore();
    const doc = await db.collection("clients").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
    }

    // Sales can only view their own clients
    if (user.role === "sales" && doc.data()?.salesOwnerUid !== user.uid) {
      return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
    }

    const data = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/clients/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { salesOwnerUid: newSalesOwner, ...rest } = body;
    const data = clientFormSchema.partial().parse(rest);

    const db = getAdminFirestore();
    const docRef = db.collection("clients").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
    }

    // Sales can only edit their own clients
    if (user.role === "sales" && existing.data()?.salesOwnerUid !== user.uid) {
      return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Handle salesOwnerUid change (admin/member only)
    if (newSalesOwner !== undefined && user.role !== "sales") {
      updateData.salesOwnerUid = newSalesOwner || null;
      const oldOwner = existing.data()?.salesOwnerUid;
      if (newSalesOwner !== oldOwner) {
        await logActivity({
          entityType: "client",
          entityId: id,
          kind: "status_change",
          text: newSalesOwner
            ? `Obchodní vlastník přiřazen`
            : `Obchodní vlastník odebrán`,
          actorUid: user.uid,
        });
      }
    }

    await docRef.update(updateData);

    // Log status change specifically
    const oldStatus = existing.data()?.status;
    if (data.status && data.status !== oldStatus) {
      await logActivity({
        entityType: "client",
        entityId: id,
        kind: "status_change",
        text: `Stav změněn z „${oldStatus}" na „${data.status}"`,
        actorUid: user.uid,
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
