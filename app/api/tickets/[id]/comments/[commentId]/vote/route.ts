import { NextResponse } from "next/server";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { chatPolls } from "@/lib/chat-markdown";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSalesClientIds } from "@/lib/sales-clients";

const voteSchema = z.object({
  /** Pořadí seznamu ke schválení ve zprávě (od 0). */
  poll: z.number().int().min(0),
  /** Pořadí bodu v seznamu (od 0). */
  item: z.number().int().min(0),
  /** ✓ / ✗, `null` = zrušit hlas. */
  verdict: z.enum(["yes", "no"]).nullable(),
});

/**
 * Hlas u bodu seznamu ke schválení ve zprávě chatu: každý člen týmu dá
 * u každého bodu ✓ nebo ✗, jde změnit i zrušit. Ukládá se do
 * `votes.{uid}.{seznam}.{bod}`. Seznam a bod se ověří z textu zprávy
 * (lib/chat-markdown.ts).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const user = await requireAuth();
    const { id, commentId } = await params;
    const parsed = voteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Neplatný hlas" }, { status: 400 });

    const db = getAdminFirestore();
    const ticketRef = db.collection("tickets").doc(id);
    const ref = ticketRef.collection("comments").doc(commentId);
    const [ticketSnap, snap] = await Promise.all([ticketRef.get(), ref.get()]);
    const ticket = ticketSnap.data();
    const owned = await getSalesClientIds(user.uid, user.role);
    if (!ticket || ticket.deletedAt || !snap.exists || (owned && !owned.has(ticket.clientId as string))) {
      return NextResponse.json({ error: "Zpráva nenalezena" }, { status: 404 });
    }

    const { poll, item, verdict } = parsed.data;
    const block = chatPolls((snap.data()?.text as string | undefined) ?? "")[poll];
    if (!block || item >= block.options.length) {
      return NextResponse.json({ error: "Bod ke schválení neexistuje" }, { status: 400 });
    }

    await ref.update(new FieldPath("votes", user.uid, String(poll), String(item)), verdict ?? FieldValue.delete());
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
