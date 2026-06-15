import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { Webhook } from "svix";
import { logActivity } from "@/lib/activity";
import { statusOrder } from "@/lib/schemas/email-status";

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

interface ResendWebhookPayload {
  type: string;
  data: {
    email_id: string;
    to?: string[];
  };
}

/**
 * Find an email record by resendId across outreachEmails and deliveryEmails.
 * Returns the doc snapshot + which collection it came from.
 */
async function findEmailByResendId(resendId: string) {
  const db = getAdminFirestore();

  // Try outreachEmails first
  const outreachSnap = await db
    .collection("outreachEmails")
    .where("resendId", "==", resendId)
    .limit(1)
    .get();

  if (!outreachSnap.empty) {
    return { doc: outreachSnap.docs[0], collection: "outreachEmails" as const };
  }

  // Try deliveryEmails
  const deliverySnap = await db
    .collection("deliveryEmails")
    .where("resendId", "==", resendId)
    .limit(1)
    .get();

  if (!deliverySnap.empty) {
    return { doc: deliverySnap.docs[0], collection: "deliveryEmails" as const };
  }

  return null;
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
    return NextResponse.json({ status: "ok" });
  }

  const found = await findEmailByResendId(resendId);
  if (!found) {
    return NextResponse.json({ status: "ok" });
  }

  const { doc: emailDoc, collection } = found;
  const emailData = emailDoc.data();
  const currentStatus = emailData.status as string;

  // Only upgrade status (higher index replaces lower).
  const currentOrder = statusOrder[currentStatus] ?? 0;
  const newOrder = statusOrder[newStatus] ?? 0;

  // Recipient already opened/clicked → the message demonstrably arrived.
  const wasEngaged = currentOrder >= statusOrder.opened;

  // A bounce that arrives AFTER engagement is almost always a false /
  // asynchronous bounce (e.g. a corporate mail-security scanner that opens
  // and clicks every link, then the server returns an async rejection).
  // Don't let it overwrite a real engagement.
  const isFalseBounce = newStatus === "bounced" && wasEngaged;

  let statusChanged = false;
  if (
    newOrder > currentOrder ||
    newStatus === "complained" ||
    (newStatus === "bounced" && !wasEngaged)
  ) {
    await emailDoc.ref.update({
      status: newStatus,
      lastEventAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    statusChanged = true;
  } else if (isFalseBounce) {
    // Record the suspicious event without clobbering the engaged status.
    await emailDoc.ref.update({
      suspectedFalseBounce: true,
      lastEventAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const db = getAdminFirestore();
  const senderUid = emailData.senderUid as string;

  if (collection === "outreachEmails") {
    // Log activity on prospect
    const prospectId = emailData.prospectId as string;

    // Only log opened/clicked on the first transition, so scanner multi-clicks
    // don't spam the activity feed with duplicate entries.
    if (newStatus === "opened" && statusChanged) {
      await logActivity({
        entityType: "prospect",
        entityId: prospectId,
        kind: "system",
        text: "Otevřel e-mail",
        actorUid: senderUid,
      });
    } else if (newStatus === "clicked" && statusChanged) {
      await logActivity({
        entityType: "prospect",
        entityId: prospectId,
        kind: "system",
        text: "Kliknul na demo ✨",
        actorUid: senderUid,
      });
    } else if (newStatus === "bounced" && isFalseBounce) {
      // Engaged then bounced — flag for review, but don't mark unreachable.
      await logActivity({
        entityType: "prospect",
        entityId: prospectId,
        kind: "system",
        text: "⚠️ Nahlášen bounce po otevření – pravděpodobně falešný (bezpečnostní skener pošty), e-mail nejspíš dorazil",
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
  } else {
    // deliveryEmails — log activity on client
    const clientId = emailData.clientId as string;

    if (newStatus === "opened" && statusChanged) {
      await logActivity({
        entityType: "client",
        entityId: clientId,
        kind: "system",
        text: "Klient otevřel vizitku",
        actorUid: senderUid,
      });
    } else if (newStatus === "clicked" && statusChanged) {
      await logActivity({
        entityType: "client",
        entityId: clientId,
        kind: "system",
        text: "Klient kliknul na vizitku ✨",
        actorUid: senderUid,
      });
    } else if (newStatus === "bounced" && isFalseBounce) {
      await logActivity({
        entityType: "client",
        entityId: clientId,
        kind: "system",
        text: "⚠️ Nahlášen bounce po otevření – pravděpodobně falešný (bezpečnostní skener pošty), e-mail nejspíš dorazil",
        actorUid: senderUid,
      });
    } else if (newStatus === "bounced") {
      await logActivity({
        entityType: "client",
        entityId: clientId,
        kind: "system",
        text: "E-mail s vizitkou se nepodařilo doručit",
        actorUid: senderUid,
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}
