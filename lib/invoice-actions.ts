import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activity";

/**
 * Vytvoří provizi za zaplacenou fakturu, pokud má klient vlastníka s rolí sales.
 * Idempotentní přes `commissions/{invoiceId}`.
 */
export async function createCommissionIfNeeded(
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

  const salesUserDoc = await db.collection("users").doc(salesOwnerUid).get();
  if (!salesUserDoc.exists) return;
  const salesUserData = salesUserDoc.data()!;
  if (salesUserData.role !== "sales") return;

  let rate = salesUserData.commissionRate as number | undefined;
  if (rate === undefined || rate === null) {
    const settingsDoc = await db.collection("settings").doc("commission").get();
    rate = (settingsDoc.data()?.defaultRate as number) ?? 0.2;
  }

  const baseAmount = invoiceData.amount as number;
  const amount = Math.round(baseAmount * rate);

  const commRef = db.collection("commissions").doc(invoiceId);
  const existing = await commRef.get();
  if (existing.exists) return;

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

/**
 * Označí fakturu jako zaplacenou (idempotentně — už zaplacenou přeskočí),
 * zaloguje aktivitu a vytvoří provizi. Sdílené mezi ruční akcí a cronem
 * (synchronizace stavu z Fakturoidu).
 */
export async function markInvoicePaid(
  db: FirebaseFirestore.Firestore,
  invoiceId: string,
  invoiceData: FirebaseFirestore.DocumentData,
  actorUid: string,
  paidAt?: Date
) {
  if (invoiceData.status === "paid" || invoiceData.status === "cancelled") return;

  await db
    .collection("invoices")
    .doc(invoiceId)
    .update({
      status: "paid",
      paidAt: paidAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  await logActivity({
    entityType: "invoice",
    entityId: invoiceId,
    kind: "status_change",
    text: `Faktura ${invoiceData.number} zaplacena`,
    actorUid,
  });

  await createCommissionIfNeeded(db, invoiceId, invoiceData, actorUid);
}

/**
 * Stornuje fakturu (status `cancelled`) a reverzuje případnou provizi:
 * pending → `reversed`, paid → záporný `{invoiceId}-reversal` záznam.
 * Sdílené mezi ruční akcí (PATCH) a úklidovým skriptem.
 */
export async function cancelInvoice(
  db: FirebaseFirestore.Firestore,
  invoiceId: string,
  invoiceData: FirebaseFirestore.DocumentData,
  actorUid: string
) {
  await db.collection("invoices").doc(invoiceId).update({
    status: "cancelled",
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logActivity({
    entityType: "invoice",
    entityId: invoiceId,
    kind: "status_change",
    text: `Faktura ${invoiceData.number} stornována`,
    actorUid,
  });

  const commRef = db.collection("commissions").doc(invoiceId);
  const commDoc = await commRef.get();
  if (!commDoc.exists) return;

  const commData = commDoc.data()!;
  if (commData.status === "pending") {
    await commRef.update({
      status: "reversed",
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else if (commData.status === "paid") {
    const reversalRef = db.collection("commissions").doc(`${invoiceId}-reversal`);
    const existingReversal = await reversalRef.get();
    if (!existingReversal.exists) {
      await reversalRef.set({
        invoiceId,
        clientId: commData.clientId,
        salesUid: commData.salesUid,
        baseAmount: -(commData.baseAmount as number),
        rate: commData.rate,
        amount: -(commData.amount as number),
        status: "pending",
        earnedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: actorUid,
      });
    }
  }
}
