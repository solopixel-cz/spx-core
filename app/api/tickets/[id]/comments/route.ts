import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSalesClientIds } from "@/lib/sales-clients";
import { notifyUsers } from "@/lib/notifications";
import { ticketCommentSchema } from "@/lib/schemas/ticket";

const PREVIEW_LENGTH = 140;

/**
 * Zpráva do chatu týmu u ticketu (`tickets/{id}/comments`). Klient ji nevidí,
 * HUB čte jen `messages`. Upozorní ostatní, kdo s ticketem mají co dělat:
 * řešitele, zakladatele a každého, kdo už v chatu psal (kromě autora).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const parsed = ticketCommentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neplatná zpráva" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const ref = db.collection("tickets").doc(id);
    const [snap, author, earlier] = await Promise.all([
      ref.get(),
      db.collection("users").doc(user.uid).get(),
      ref.collection("comments").select("authorUid").get(),
    ]);
    const ticket = snap.data();
    const owned = await getSalesClientIds(user.uid, user.role);
    if (!ticket || ticket.deletedAt || (owned && !owned.has(ticket.clientId as string))) {
      return NextResponse.json({ error: "Ticket nenalezen" }, { status: 404 });
    }

    const authorName = (author.data()?.displayName as string | undefined) || user.email || "Tým";
    const batch = db.batch();
    batch.set(ref.collection("comments").doc(), {
      authorUid: user.uid,
      authorName,
      text: parsed.data.text,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.update(ref, {
      commentCount: FieldValue.increment(1),
      lastCommentAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    const participants = [
      ticket.assigneeUid as string | undefined,
      // U ticketu z HUBu je zakladatel klient, ten chat týmu nevidí.
      ticket.source === "hub" ? undefined : (ticket.createdBy as string | undefined),
      ...earlier.docs.map((d) => d.data().authorUid as string | undefined),
    ].filter((uid): uid is string => !!uid && uid !== user.uid);
    const text = parsed.data.text;
    await notifyUsers(participants, {
      type: "ticket.comment",
      title: `${authorName}: ${ticket.title as string}`,
      body: text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text,
      href: `/backlog/${id}`,
      entityType: "ticket",
      entityId: id,
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
