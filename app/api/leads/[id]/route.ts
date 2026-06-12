import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { leadFormSchema } from "@/lib/schemas/lead";
import { logActivity } from "@/lib/activity";
import { clientFormSchema } from "@/lib/schemas/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const db = getAdminFirestore();
    const doc = await db.collection("leads").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Lead nenalezen" }, { status: 404 });
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = leadFormSchema.partial().parse(body);

    const db = getAdminFirestore();
    const docRef = db.collection("leads").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Lead nenalezen" }, { status: 404 });
    }

    await docRef.update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const oldStage = existing.data()?.stage;
    if (data.stage && data.stage !== oldStage) {
      await logActivity({
        entityType: "lead",
        entityId: id,
        kind: "status_change",
        text: `Fáze změněna z „${oldStage}" na „${data.stage}"`,
        actorUid: user.uid,
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// POST /api/leads/[id] — actions: won, lost
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = (await request.json()) as {
      action: "won" | "lost";
      lostReason?: string;
    };

    const db = getAdminFirestore();
    const leadRef = db.collection("leads").doc(id);
    const leadDoc = await leadRef.get();

    if (!leadDoc.exists) {
      return NextResponse.json({ error: "Lead nenalezen" }, { status: 404 });
    }

    const leadData = leadDoc.data()!;

    if (body.action === "won") {
      const slug = leadData.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      const clientData = clientFormSchema.parse({
        name: leadData.name,
        company: leadData.company || "",
        email: leadData.email || "",
        phone: leadData.phone || "",
        status: "onboarding",
        advisorSlug: slug,
        notes: leadData.notes || "",
      });

      // Check if lead owner is a sales user → set salesOwnerUid for commissions
      let salesOwnerUid: string | null = null;
      if (leadData.ownerUid) {
        const ownerDoc = await db.collection("users").doc(leadData.ownerUid).get();
        if (ownerDoc.exists && ownerDoc.data()?.role === "sales") {
          salesOwnerUid = leadData.ownerUid;
        }
      }

      const clientRef = await db.collection("clients").add({
        ...clientData,
        leadId: id,
        salesOwnerUid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: user.uid,
      });

      await leadRef.update({
        stage: "won",
        updatedAt: FieldValue.serverTimestamp(),
      });

      await logActivity({
        entityType: "lead",
        entityId: id,
        kind: "status_change",
        text: "Lead vyhrán — vytvořen klient",
        actorUid: user.uid,
      });

      await logActivity({
        entityType: "client",
        entityId: clientRef.id,
        kind: "system",
        text: `Klient vytvořen z leadu „${leadData.name}"`,
        actorUid: user.uid,
      });

      // Generate onboarding tasks from template
      let tasksGenerated = 0;
      try {
        const templateSnap = await db
          .collection("templates")
          .doc("onboarding")
          .get();
        if (templateSnap.exists) {
          const steps = templateSnap.data()?.steps as
            | Array<{ title: string; offsetDays: number }>
            | undefined;
          if (steps && steps.length > 0) {
            const now = new Date();
            for (const step of steps) {
              const dueDate = new Date(now);
              dueDate.setDate(dueDate.getDate() + step.offsetDays);
              await db.collection("tasks").add({
                title: step.title,
                clientId: clientRef.id,
                leadId: id,
                assigneeUid: leadData.ownerUid || user.uid,
                dueAt: dueDate,
                status: "open",
                checklistTemplateId: "onboarding",
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                createdBy: user.uid,
              });
              tasksGenerated++;
            }
          }
        }
      } catch {
        // Template doesn't exist — skip
      }

      return NextResponse.json({
        status: "ok",
        clientId: clientRef.id,
        tasksGenerated,
      });
    }

    if (body.action === "lost") {
      if (!body.lostReason) {
        return NextResponse.json(
          { error: "Důvod ztráty je povinný" },
          { status: 400 }
        );
      }

      await leadRef.update({
        stage: "lost",
        lostReason: body.lostReason,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await logActivity({
        entityType: "lead",
        entityId: id,
        kind: "status_change",
        text: `Lead ztracen: ${body.lostReason}`,
        actorUid: user.uid,
      });

      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
