import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { getSalesClientIds } from "@/lib/sales-clients";
import { TICKET_STATUSES, ticketStatusLabels } from "@/lib/ticket-labels";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = (await request.json()) as {
      status?: string;
      assigneeUid?: string;
      title?: string;
      description?: string;
      type?: string;
      priority?: string;
      /** null = interní ticket (bez klienta). */
      clientId?: string | null;
      /** null = bez vizitky / webu. */
      instanceId?: string | null;
      links?: string[];
      prLinks?: string[];
    };

    const db = getAdminFirestore();
    const docRef = db.collection("tickets").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Ticket nenalezen" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    const ticket = existing.data()!;
    const owned = await getSalesClientIds(user.uid, user.role);
    if (owned && !owned.has(ticket.clientId as string)) {
      return NextResponse.json({ error: "Ticket nenalezen" }, { status: 404 });
    }
    if (body.status && !TICKET_STATUSES.includes(body.status) && body.status !== "closed") {
      return NextResponse.json({ error: "Neplatný stav" }, { status: 400 });
    }
    const statusChanged = Boolean(body.status && body.status !== ticket.status);
    if (body.status) updates.status = body.status;
    // Ticket z HUBu: změnu stavu klient uvidí jako nepřečtenou (kromě uzavření).
    // E-mail ani push se neposílá, to dělá tým ručně (POST /api/tickets/[id]/notify).
    if (statusChanged && ticket.source === "hub" && body.status !== "closed") updates.unreadByClient = true;
    // Prázdný řetězec = zrušit přiřazení.
    if (body.assigneeUid !== undefined) updates.assigneeUid = body.assigneeUid || FieldValue.delete();
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.type) updates.type = body.type;
    if (body.priority) updates.priority = body.priority;
    if (body.clientId === null) {
      // Ticket z HUBu patří klientovi, který ho založil (vidí ho v HUBu).
      if (ticket.source === "hub" || owned) {
        return NextResponse.json({ error: "Ticket musí mít klienta" }, { status: 400 });
      }
      updates.clientId = FieldValue.delete();
      updates.instanceId = FieldValue.delete();
    } else if (body.clientId) {
      if (owned && !owned.has(body.clientId)) {
        return NextResponse.json({ error: "Vyberte klienta" }, { status: 400 });
      }
      updates.clientId = body.clientId;
    }
    if (body.instanceId === null && body.clientId !== null) updates.instanceId = FieldValue.delete();
    else if (body.instanceId && body.clientId !== null) updates.instanceId = body.instanceId;
    if (body.links !== undefined) updates.links = body.links;
    if (body.prLinks !== undefined) {
      const prLinks = z.array(z.string().url()).max(30).safeParse(body.prLinks);
      if (!prLinks.success) return NextResponse.json({ error: "Neplatný odkaz na PR" }, { status: 400 });
      updates.prLinks = [...new Set(prLinks.data)];
    }

    await docRef.update(updates);

    if (body.status) {
      await logActivity({
        entityType: "ticket",
        entityId: id,
        kind: "status_change",
        text: `Stav změněn na „${ticketStatusLabels[body.status] ?? body.status}"`,
        actorUid: user.uid,
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
