import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { Webhook } from "svix";
import { logActivity } from "@/lib/activity";
import { statusOrder } from "@/lib/schemas/outreach-email";

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

interface ResendWebhookPayload {
  type: string;
  data: {
    email_id: string;
    to?: string[];
  };
}

export async function POST(request: Request) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify signature
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing webhook headers" }, { status: 401 });
  }

  const body = await request.text();

  let payload: ResendWebhookPayload;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    payload = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventType = payload.type;
  const resendId = payload.data.email_id;

  if (!resendId) {
    return NextResponse.json({ status: "ok" });
  }

  // Map Resend event to our status
  const eventToStatus: Record<string, string> = {
    "email.delivered": "delivered",
    "email.opened": "opened",
    "email.clicked": "clicked",
    "email.bounced": "bounced",
    "email.complained": "complained",
  };

  const newStatus = eventToStatus[eventType];
  if (!newStatus) {
    // Unknown event type, ignore
    return NextResponse.json({ status: "ok" });
  }

  const db = getAdminFirestore();

  // Find the outreach email by resendId
  const emailSnap = await db
    .collection("outreachEmails")
    .where("resendId", "==", resendId)
    .limit(1)
    .get();

  if (emailSnap.empty) {
    // Not our email, ignore
    return NextResponse.json({ status: "ok" });
  }

  const emailDoc = emailSnap.docs[0];
  const emailData = emailDoc.data();
  const currentStatus = emailData.status as string;

  // Only upgrade status (higher index replaces lower, except bounced/complained always apply)
  const currentOrder = statusOrder[currentStatus] ?? 0;
  const newOrder = statusOrder[newStatus] ?? 0;

  if (newOrder > currentOrder || newStatus === "bounced" || newStatus === "complained") {
    await emailDoc.ref.update({
      status: newStatus,
      lastEventAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Log activity on prospect for specific events
  const prospectId = emailData.prospectId as string;
  const senderUid = emailData.senderUid as string;

  if (newStatus === "opened") {
    await logActivity({
      entityType: "prospect",
      entityId: prospectId,
      kind: "system",
      text: "Otevřel e-mail",
      actorUid: senderUid,
    });
  } else if (newStatus === "clicked") {
    await logActivity({
      entityType: "prospect",
      entityId: prospectId,
      kind: "system",
      text: "Kliknul na demo ✨",
      actorUid: senderUid,
    });
  } else if (newStatus === "bounced") {
    await logActivity({
      entityType: "prospect",
      entityId: prospectId,
      kind: "system",
      text: "E-mail se nepodařilo doručit",
      actorUid: senderUid,
    });

    // Mark prospect as unreachable if no phone
    const prospectDoc = await db.collection("prospects").doc(prospectId).get();
    if (prospectDoc.exists) {
      const pData = prospectDoc.data()!;
      if (!pData.phone) {
        await prospectDoc.ref.update({
          status: "unreachable",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
