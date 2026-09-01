import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { clientFormSchema } from "@/lib/schemas/client";
import { logActivity } from "@/lib/activity";
import { renderSubject, sendTransactionalEmail } from "@/lib/email";
import { renderDeliveryEmail, DEFAULT_DELIVERY_SUBJECT } from "@/lib/email-templates/delivery";

// GET /api/clients/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const db = getAdminFirestore();
    const doc = await db.collection("clients").doc(id).get();

    if (!doc.exists) {
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

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Změna vlastníka klienta
    if (newSalesOwner !== undefined) {
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

    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// POST /api/clients/[id] — actions: send_card
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const action = body.action as string;

    if (action !== "send_card") {
      return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const clientDoc = await db.collection("clients").doc(id).get();

    if (!clientDoc.exists) {
      return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
    }

    const clientData = clientDoc.data()!;

    if (!clientData.email) {
      return NextResponse.json({ error: "Klient nemá e-mail" }, { status: 400 });
    }

    // Resolve instance
    const instanceId = body.instanceId as string | undefined;
    let instance: { id: string; domain: string; status: string };

    if (instanceId) {
      const instDoc = await db.collection("instances").doc(instanceId).get();
      if (!instDoc.exists || instDoc.data()?.clientId !== id) {
        return NextResponse.json({ error: "Instance nenalezena" }, { status: 404 });
      }
      instance = { id: instDoc.id, domain: instDoc.data()!.domain, status: instDoc.data()!.status };
    } else {
      const instSnap = await db
        .collection("instances")
        .where("clientId", "==", id)
        .get();
      if (instSnap.empty) {
        return NextResponse.json({ error: "Klient nemá vizitku" }, { status: 400 });
      }
      if (instSnap.size > 1) {
        return NextResponse.json({ error: "Klient má víc instancí — vyber, kterou vizitku poslat" }, { status: 400 });
      }
      const instDoc = instSnap.docs[0];
      instance = { id: instDoc.id, domain: instDoc.data().domain, status: instDoc.data().status };
    }

    const odkaz = `https://${instance.domain}`;

    // Load subject template
    const templateDoc = await db.collection("templates").doc("delivery-email").get();
    const subjectTemplate = (templateDoc.data()?.subject as string) || DEFAULT_DELIVERY_SUBJECT;

    // Get sender info
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();
    const senderName = (userData?.senderName as string) || (userData?.displayName as string) || "SoloPixel";
    const senderEmail = (userData?.senderEmail as string) || user.email;

    // Render and send
    const greeting = body.greeting as string | undefined;
    const jmeno = greeting || clientData.name.split(" ")[0];
    const renderedSubject = renderSubject(subjectTemplate, { jmeno, odkaz });
    const { html, text } = renderDeliveryEmail({ jmeno, odkaz });

    const result = await sendTransactionalEmail({
      to: clientData.email,
      senderName,
      senderEmail,
      subject: renderedSubject,
      html,
      text,
    });

    // Save delivery email record
    await db.collection("deliveryEmails").add({
      clientId: id,
      instanceId: instance.id,
      toEmail: clientData.email,
      senderUid: user.uid,
      resendId: result?.id || "",
      subject: renderedSubject,
      status: "sent",
      sentAt: FieldValue.serverTimestamp(),
      lastEventAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    await logActivity({
      entityType: "client",
      entityId: id,
      kind: "email",
      text: `Předána hotová vizitka na ${clientData.email}`,
      actorUid: user.uid,
    });

    // Optional status flips
    const setInstanceLive = body.setInstanceLive as boolean | undefined;
    if (setInstanceLive && instance.status === "setup") {
      await db.collection("instances").doc(instance.id).update({
        status: "live",
        updatedAt: FieldValue.serverTimestamp(),
      });
      await logActivity({
        entityType: "client",
        entityId: id,
        kind: "status_change",
        text: `Instance ${instance.domain} přepnuta na „live"`,
        actorUid: user.uid,
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
