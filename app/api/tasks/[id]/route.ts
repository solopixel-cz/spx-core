import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyUsers } from "@/lib/notifications";

/** Posune datum o zvolený interval opakování. */
function advance(date: Date, recurrence: string): void {
  switch (recurrence) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const db = getAdminFirestore();
    const ref = db.collection("tasks").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Úkol nenalezen" }, { status: 404 });
    }
    const prev = snap.data()!;

    const updates: Record<string, unknown> = {
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (body.dueAt) {
      updates.dueAt = new Date(body.dueAt);
    }

    await ref.update(updates);

    // Notifikuj nového řešitele, pokud mu úkol přeřadil někdo jiný.
    if (
      body.assigneeUid &&
      body.assigneeUid !== prev.assigneeUid &&
      body.assigneeUid !== user.uid
    ) {
      const actorSnap = await db.collection("users").doc(user.uid).get();
      const actorName = (actorSnap.data()?.displayName as string) ?? "Někdo";
      await notifyUsers([body.assigneeUid], {
        type: "task.assigned",
        title: "Nový úkol pro tebe",
        body: `${actorName} ti přiřadil úkol „${prev.title}"`,
        href: "/ukoly",
        entityType: "task",
        entityId: id,
      });
    }

    // Opakování: při přechodu na „hotovo" založ další výskyt s posunutým termínem.
    const becomingDone = body.status === "done" && prev.status !== "done";
    const recurrence = prev.recurrence as string | undefined;
    if (becomingDone && recurrence && recurrence !== "none") {
      const base = prev.dueAt?.toDate?.() ?? new Date();
      const nextDue = new Date(base);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Posuň alespoň jednou; případný nedávno zmeškaný interval přeskoč do budoucna.
      do {
        advance(nextDue, recurrence);
      } while (nextDue < today);

      const next: Record<string, unknown> = {
        title: prev.title,
        assigneeUid: prev.assigneeUid,
        status: "open",
        recurrence,
        dueAt: nextDue,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: prev.createdBy ?? user.uid,
      };
      // Zkopíruj jen definované volitelné vazby (Firestore neumí undefined).
      for (const key of ["description", "clientId", "leadId", "ticketId"] as const) {
        if (prev[key] != null) next[key] = prev[key];
      }
      await db.collection("tasks").add(next);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin", "member");
    const { id } = await params;
    const db = getAdminFirestore();
    // Úkoly nejsou archivovatelné → tvrdé smazání.
    await db.collection("tasks").doc(id).delete();
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
