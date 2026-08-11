import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { taskFormSchema } from "@/lib/schemas/task";
import { notifyUsers } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const assignee = searchParams.get("assigneeUid");

    const db = getAdminFirestore();
    let query: FirebaseFirestore.Query = db.collection("tasks").orderBy("createdAt", "desc");

    if (clientId) {
      query = db.collection("tasks").where("clientId", "==", clientId).orderBy("createdAt", "desc");
    } else if (assignee) {
      query = db.collection("tasks").where("assigneeUid", "==", assignee).orderBy("createdAt", "desc");
    }

    const snapshot = await query.get();
    const tasks = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dueAt: data.dueAt?.toDate?.()?.toISOString() ?? null,
        doneAt: data.doneAt?.toDate?.()?.toISOString() ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json(tasks);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = taskFormSchema.parse(body);

    const db = getAdminFirestore();
    const docRef = await db.collection("tasks").add({
      ...data,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    // Notifikuj řešitele, pokud mu úkol přiřadil někdo jiný.
    if (data.assigneeUid && data.assigneeUid !== user.uid) {
      const actorSnap = await db.collection("users").doc(user.uid).get();
      const actorName = (actorSnap.data()?.displayName as string) ?? "Někdo";
      await notifyUsers([data.assigneeUid], {
        type: "task.assigned",
        title: "Nový úkol pro tebe",
        body: `${actorName} ti přiřadil úkol „${data.title}"`,
        href: "/ukoly",
        entityType: "task",
        entityId: docRef.id,
      });
    }

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
