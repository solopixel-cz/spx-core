import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activity";
import { invoiceFormSchema, invoiceItemsTotal } from "@/lib/schemas/invoice";
import { markInvoicePaid } from "@/lib/invoice-actions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin", "member");
    const { id } = await params;
    const body = (await request.json()) as { action: string } & Record<
      string,
      unknown
    >;

    const db = getAdminFirestore();
    const docRef = db.collection("invoices").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 });
    }

    const data = doc.data()!;

    if (body.action === "paid") {
      await markInvoicePaid(db, id, data, user.uid);
    } else if (body.action === "cancelled") {
      await docRef.update({
        status: "cancelled",
        updatedAt: FieldValue.serverTimestamp(),
      });
      await logActivity({
        entityType: "invoice",
        entityId: id,
        kind: "status_change",
        text: `Faktura ${data.number} stornována`,
        actorUid: user.uid,
      });

      // Handle commission reversal
      const commRef = db.collection("commissions").doc(id);
      const commDoc = await commRef.get();
      if (commDoc.exists) {
        const commData = commDoc.data()!;
        if (commData.status === "pending") {
          // Simply reverse the pending commission
          await commRef.update({
            status: "reversed",
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (commData.status === "paid") {
          // Create a negative reversal record
          const reversalRef = db.collection("commissions").doc(`${id}-reversal`);
          const existingReversal = await reversalRef.get();
          if (!existingReversal.exists) {
            await reversalRef.set({
              invoiceId: id,
              clientId: commData.clientId,
              salesUid: commData.salesUid,
              baseAmount: -(commData.baseAmount as number),
              rate: commData.rate,
              amount: -(commData.amount as number),
              status: "pending",
              earnedAt: FieldValue.serverTimestamp(),
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
              createdBy: user.uid,
            });
          }
        }
      }
    } else if (body.action === "update") {
      if (data.status !== "draft") {
        return NextResponse.json(
          { error: "Upravit lze jen koncept faktury" },
          { status: 400 }
        );
      }
      const parsed = invoiceFormSchema.parse(body);
      const amount = invoiceItemsTotal(parsed.items);
      const variableSymbol =
        parsed.variableSymbol?.trim() ||
        (data.number as string).replace(/\D/g, "");

      await docRef.update({
        clientId: parsed.clientId,
        items: parsed.items,
        amount,
        variableSymbol,
        note: parsed.note?.trim() || null,
        dueAt: new Date(parsed.dueAt),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await logActivity({
        entityType: "invoice",
        entityId: id,
        kind: "system",
        text: `Koncept faktury ${data.number} upraven`,
        actorUid: user.uid,
      });
    } else {
      return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
