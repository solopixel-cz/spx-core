import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSalesClientIds } from "@/lib/sales-clients";
import { logActivity } from "@/lib/activity";
import { notifyHubClient, teamSender } from "@/lib/ticket-hub";

const LABELS = { waiting_client: "Čeká na klienta", resolved: "Vyřešený" } as const;

/**
 * Ruční e-mail (a push) klientovi k aktuálnímu stavu ticketu z HUBu:
 * „Potřebujeme od vás doplnit informace“ nebo „Hotovo“. Změna stavu sama
 * nic neposílá, tým rozhoduje, kdy klientovi napsat. Ukládá `clientNotified`.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const db = getAdminFirestore();
    const ref = db.collection("tickets").doc(id);
    const ticket = (await ref.get()).data();
    const owned = await getSalesClientIds(user.uid, user.role);
    if (!ticket || ticket.deletedAt || (owned && !owned.has(ticket.clientId as string))) {
      return NextResponse.json({ error: "Ticket nenalezen" }, { status: 404 });
    }
    if (ticket.source !== "hub") {
      return NextResponse.json({ error: "E-mail jde poslat jen k ticketu z HUBu" }, { status: 400 });
    }
    const status = ticket.status as string;
    if (status !== "waiting_client" && status !== "resolved") {
      return NextResponse.json({ error: "E-mail jde poslat jen ve stavu Čeká na klienta nebo Vyřešený" }, { status: 400 });
    }

    const result = await notifyHubClient({ ticketId: id, ticket, kind: status, sender: await teamSender(user) });
    if (result.email !== "sent") {
      return NextResponse.json({ error: result.error ?? "E-mail se nepodařilo odeslat" }, { status: 502 });
    }

    await ref.update({
      clientNotified: { status, at: FieldValue.serverTimestamp(), byUid: user.uid },
      updatedAt: FieldValue.serverTimestamp(),
    });
    await logActivity({
      entityType: "ticket",
      entityId: id,
      kind: "system",
      text: `E-mail klientovi: ${LABELS[status]}`,
      actorUid: user.uid,
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
