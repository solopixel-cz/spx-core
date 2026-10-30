import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activity";

/**
 * Označí fakturu jako zaplacenou (idempotentně — už zaplacenou přeskočí)
 * a zaloguje aktivitu. Volá se z ruční akce „Zaplaceno".
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
}

/**
 * Stornuje fakturu (status `cancelled`) a zaloguje aktivitu.
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
}
