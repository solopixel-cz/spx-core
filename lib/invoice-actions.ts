import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activity";
import { notifyInvoicePaid } from "@/lib/hub-push";
import { billingAnchor, nextCycleDay, pragueDay, pragueMidnight } from "@/lib/calendar";

/**
 * Označí fakturu jako zaplacenou (idempotentně — už zaplacenou přeskočí)
 * a zaloguje aktivitu. Volá se z ruční akce „Zaplaceno". Klient dostane notifikaci v HUBu.
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

  await notifyInvoicePaid({ clientId: invoiceData.clientId, number: invoiceData.number, amount: invoiceData.amount });
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
  // Nevystavené období předplatného se vrátí do kalendáře.
  if (invoiceData.status !== "draft") await rewindSubscriptionPeriod(db, invoiceData);

  await logActivity({
    entityType: "invoice",
    entityId: invoiceId,
    kind: "status_change",
    text: `Faktura ${invoiceData.number} stornována`,
    actorUid,
  });
}

/**
 * Faktura vystavená z předplatného pokryje jeho aktuální období: `nextInvoiceAt`
 * se posune o měsíc / rok a faktura si zapamatuje `billingPeriodAt` (začátek
 * pokrytého období). Kalendář pak úkol „Vystavit fakturu“ odškrtne. Volá se při
 * vystavení (ne u konceptu). Idempotentní: faktura s `billingPeriodAt` se přeskočí.
 */
export async function advanceSubscriptionPeriod(db: FirebaseFirestore.Firestore, invoiceId: string) {
  const invoiceRef = db.collection("invoices").doc(invoiceId);
  await db.runTransaction(async (tx) => {
    const invoice = await tx.get(invoiceRef);
    const inv = invoice.data();
    if (!inv?.subscriptionId || inv.billingPeriodAt || inv.status === "draft" || inv.status === "cancelled") return;
    const subRef = db.collection("subscriptions").doc(inv.subscriptionId as string);
    const sub = (await tx.get(subRef)).data();
    const period = sub?.nextInvoiceAt?.toDate?.() as Date | undefined;
    if (!sub || !period || sub.clientId !== inv.clientId || sub.status === "cancelled" || sub.internal) return;
    const anchor = billingAnchor(sub.startedAt?.toDate?.(), period);
    const next = pragueMidnight(nextCycleDay(pragueDay(period), sub.billingCycle, anchor));
    tx.update(subRef, { nextInvoiceAt: next, updatedAt: FieldValue.serverTimestamp() });
    tx.update(invoiceRef, { billingPeriodAt: period, updatedAt: FieldValue.serverTimestamp() });
  });
}

/**
 * Storno nebo smazání faktury z předplatného vrátí `nextInvoiceAt` zpět na její
 * období, ale jen když se od té doby neposunulo jinak (další faktura, ruční změna).
 */
export async function rewindSubscriptionPeriod(db: FirebaseFirestore.Firestore, invoiceData: FirebaseFirestore.DocumentData) {
  const period = invoiceData.billingPeriodAt?.toDate?.() as Date | undefined;
  if (!invoiceData.subscriptionId || !period) return;
  const subRef = db.collection("subscriptions").doc(invoiceData.subscriptionId as string);
  await db.runTransaction(async (tx) => {
    const sub = (await tx.get(subRef)).data();
    const current = sub?.nextInvoiceAt?.toDate?.() as Date | undefined;
    if (!sub || !current) return;
    const anchor = billingAnchor(sub.startedAt?.toDate?.(), period);
    if (pragueDay(current) !== nextCycleDay(pragueDay(period), sub.billingCycle, anchor)) return;
    tx.update(subRef, { nextInvoiceAt: period, updatedAt: FieldValue.serverTimestamp() });
  });
}

/**
 * Ruční posun příští fakturace o jedno období bez vystavení faktury („Už
 * vyfakturováno“ v kalendáři), `back` ho vrátí. Projde jen když předplatné stojí
 * na očekávaném dni, takže dvojklik nebo starý kalendář nic neposune dvakrát.
 * Vrací nový den (YYYY-MM-DD), nebo null když se nic nezměnilo.
 */
export async function shiftSubscriptionPeriod(
  db: FirebaseFirestore.Firestore,
  subscriptionId: string,
  period: string,
  direction: "forward" | "back"
): Promise<string | null> {
  const subRef = db.collection("subscriptions").doc(subscriptionId);
  return db.runTransaction(async (tx) => {
    const sub = (await tx.get(subRef)).data();
    const current = sub?.nextInvoiceAt?.toDate?.() as Date | undefined;
    if (!sub || !current || sub.status === "cancelled") return null;
    const anchor = billingAnchor(sub.startedAt?.toDate?.(), pragueMidnight(period));
    const next = nextCycleDay(period, sub.billingCycle, anchor);
    const [expected, target] = direction === "forward" ? [period, next] : [next, period];
    if (pragueDay(current) !== expected) return null;
    tx.update(subRef, { nextInvoiceAt: pragueMidnight(target), updatedAt: FieldValue.serverTimestamp() });
    return target;
  });
}
