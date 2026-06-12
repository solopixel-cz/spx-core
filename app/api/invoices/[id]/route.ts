import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activity";

async function createCommissionIfNeeded(
  db: FirebaseFirestore.Firestore,
  invoiceId: string,
  invoiceData: FirebaseFirestore.DocumentData,
  actorUid: string
) {
  const clientId = invoiceData.clientId as string;
  if (!clientId) return;

  const clientDoc = await db.collection("clients").doc(clientId).get();
  if (!clientDoc.exists) return;

  const salesOwnerUid = clientDoc.data()?.salesOwnerUid as string | undefined;
  if (!salesOwnerUid) return;

  // Verify the owner is actually a sales user
  const salesUserDoc = await db.collection("users").doc(salesOwnerUid).get();
  if (!salesUserDoc.exists) return;
  const salesUserData = salesUserDoc.data()!;
  if (salesUserData.role !== "sales") return;

  // Get commission rate: user-specific or default
  let rate = salesUserData.commissionRate as number | undefined;
  if (rate === undefined || rate === null) {
    const settingsDoc = await db.collection("settings").doc("commission").get();
    rate = (settingsDoc.data()?.defaultRate as number) ?? 0.2;
  }

  const baseAmount = invoiceData.amount as number;
  const amount = Math.round(baseAmount * rate);

  // Use invoiceId as doc ID for idempotence
  const commRef = db.collection("commissions").doc(invoiceId);
  const existing = await commRef.get();
  if (existing.exists) return; // already created

  await commRef.set({
    invoiceId,
    clientId,
    salesUid: salesOwnerUid,
    baseAmount,
    rate,
    amount,
    status: "pending",
    earnedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: actorUid,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin", "member");
    const { id } = await params;
    const body = (await request.json()) as { action: string };

    const db = getAdminFirestore();
    const docRef = db.collection("invoices").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 });
    }

    const data = doc.data()!;

    if (body.action === "paid") {
      await docRef.update({
        status: "paid",
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await logActivity({
        entityType: "invoice",
        entityId: id,
        kind: "status_change",
        text: `Faktura ${data.number} zaplacena`,
        actorUid: user.uid,
      });

      // Create commission if client has a sales owner
      await createCommissionIfNeeded(db, id, data, user.uid);
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
    } else {
      return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
