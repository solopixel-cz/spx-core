import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSalesClientIds } from "@/lib/sales-clients";
import { logActivity } from "@/lib/activity";
import { ticketReplySchema } from "@/lib/schemas/ticket";
import { notifyHubClient, teamSender } from "@/lib/ticket-hub";

/**
 * Odpověď týmu do vlákna ticketu z HUBu (`tickets/{id}/messages`).
 * Klient dostane e-mail a push, v HUBu uvidí ticket jako nepřečtený.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const parsed = ticketReplySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neplatná odpověď" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const ref = db.collection("tickets").doc(id);
    const snap = await ref.get();
    const ticket = snap.data();
    const owned = await getSalesClientIds(user.uid, user.role);
    if (!ticket || ticket.deletedAt || (owned && !owned.has(ticket.clientId as string))) {
      return NextResponse.json({ error: "Ticket nenalezen" }, { status: 404 });
    }
    if (ticket.source !== "hub") {
      return NextResponse.json({ error: "Odpovídat jde jen na tickety z HUBu" }, { status: 400 });
    }

    const sender = await teamSender(user);
    const batch = db.batch();
    batch.set(ref.collection("messages").doc(), {
      from: "team",
      authorUid: user.uid,
      authorName: sender.displayName,
      text: parsed.data.text,
      attachments: [],
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.update(ref, {
      messageCount: FieldValue.increment(1),
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageFrom: "team",
      unreadByClient: true,
      unreadByTeam: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    await logActivity({
      entityType: "ticket",
      entityId: id,
      kind: "system",
      text: "Odpověď klientovi do HUBu",
      actorUid: user.uid,
    });
    await notifyHubClient({ ticketId: id, ticket, kind: "reply", message: parsed.data.text, sender });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
