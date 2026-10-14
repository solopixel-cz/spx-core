import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { subscriptionFormPartialSchema } from "@/lib/schemas/subscription";
import { subscriptionLabel } from "@/lib/plans";
import { logActivity } from "@/lib/activity";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin", "member");
    const { id } = await params;
    const body = await request.json();
    const data = subscriptionFormPartialSchema.parse(body);

    // Datumová pole chodí jako yyyy-mm-dd string — v DB musí být Timestamp
    // (fakturační cron je čte přes .toDate()). Prázdné pole neměníme.
    const { startedAt, nextInvoiceAt, ...rest } = data;
    const updates: Record<string, unknown> = {
      ...rest,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (startedAt) updates.startedAt = new Date(startedAt);
    if (nextInvoiceAt) updates.nextInvoiceAt = new Date(nextInvoiceAt);
    if (rest.service !== undefined && rest.service !== "card") updates.plan = null;
    if (rest.label !== undefined) updates.label = rest.label.trim() || null;
    if (rest.instanceId !== undefined) updates.instanceId = rest.instanceId || null;

    const db = getAdminFirestore();
    await db.collection("subscriptions").doc(id).update(updates);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Trvalé smazání předplatného (jen admin), např. omylem založeného. Jen bez
 * faktur: předplatné s fakturami se ruší stavem „Zrušeno“, aby doklady
 * neztratily vazbu. Smazání se zaloguje u klienta.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin");
    const { id } = await params;

    const db = getAdminFirestore();
    const docRef = db.collection("subscriptions").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Předplatné nenalezeno" }, { status: 404 });
    }
    const data = doc.data()!;

    const invoices = await db.collection("invoices").where("subscriptionId", "==", id).limit(1).get();
    if (!invoices.empty) {
      return NextResponse.json(
        { error: "Předplatné už má faktury. Místo smazání nastavte stav Zrušeno." },
        { status: 409 }
      );
    }

    await docRef.delete();

    if (data.clientId) {
      await logActivity({
        entityType: "client",
        entityId: data.clientId as string,
        kind: "system",
        text: `Předplatné „${subscriptionLabel(data)}" smazáno`,
        actorUid: user.uid,
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: status === 403 ? "Mazat předplatné může jen admin." : message }, { status });
  }
}
