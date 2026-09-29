import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { subscriptionFormPartialSchema } from "@/lib/schemas/subscription";

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
