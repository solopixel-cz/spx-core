import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { markInvoicePaid } from "@/lib/invoice-actions";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { isFakturoidConfigured, getInvoice } from "@/lib/fakturoid";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Denní fakturační cron (Vercel Cron → GET). Chráněno CRON_SECRET
 * (Vercel posílá `Authorization: Bearer ${CRON_SECRET}`).
 *
 * 1) Vygeneruje faktury z předplatných, kterým nastal `nextInvoiceAt`.
 * 2) Materializuje `overdue` u faktur po splatnosti + upozorní adminy.
 * 3) Synchronizuje stav zaplacení z Fakturoidu (pokud je nakonfigurovaný).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET není nastaven" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  const now = new Date();
  const summary = { generated: 0, overdue: 0, paidSynced: 0 };

  // 1) Opakované faktury z předplatných.
  const dueSubs = await db
    .collection("subscriptions")
    .where("nextInvoiceAt", "<=", now)
    .get();

  for (const subDoc of dueSubs.docs) {
    const sub = subDoc.data();
    if (sub.status !== "active" && sub.status !== "past_due") continue;

    const clientSnap = await db.collection("clients").doc(sub.clientId).get();
    if (!clientSnap.exists || clientSnap.data()?.deletedAt) continue;

    const monthly = (sub.priceMonthly as number) ?? 0;
    const base = sub.billingCycle === "yearly" ? monthly * 12 : monthly;
    const discount = (sub.discountPercent as number) ?? 0;
    const amount = Math.round(base * (1 - discount / 100));

    const cycleLabel = sub.billingCycle === "yearly" ? "roční" : "měsíční";
    const number = await generateInvoiceNumber(db);
    const dueAt = new Date(now.getTime() + 14 * 86400000);

    const invRef = await db.collection("invoices").add({
      clientId: sub.clientId,
      number,
      amount,
      items: [
        {
          description: `Předplatné ${sub.plan} (${cycleLabel})`,
          quantity: 1,
          unitPrice: amount,
        },
      ],
      variableSymbol: number.replace(/\D/g, ""),
      subscriptionId: subDoc.id,
      note: null,
      issuedAt: now,
      dueAt,
      status: "sent",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: "system-cron",
    });

    // Posuň příští fakturaci do budoucna.
    const next = new Date(sub.nextInvoiceAt.toDate());
    do {
      if (sub.billingCycle === "yearly") next.setFullYear(next.getFullYear() + 1);
      else next.setMonth(next.getMonth() + 1);
    } while (next <= now);
    await subDoc.ref.update({
      nextInvoiceAt: next,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logActivity({
      entityType: "invoice",
      entityId: invRef.id,
      kind: "system",
      text: `Faktura ${number} vygenerována z předplatného`,
      actorUid: "system-cron",
    });
    await notify({
      type: "invoice.generated",
      title: "Nová faktura z předplatného",
      body: `${number} · ${amount.toLocaleString("cs-CZ")} Kč`,
      href: `/fakturace/${invRef.id}`,
      entityType: "invoice",
      entityId: invRef.id,
    });
    summary.generated++;
  }

  // 2) Materializace stavu po splatnosti.
  const overdueSnap = await db
    .collection("invoices")
    .where("status", "==", "sent")
    .where("dueAt", "<", now)
    .get();

  for (const invDoc of overdueSnap.docs) {
    const inv = invDoc.data();
    await invDoc.ref.update({
      status: "overdue",
      updatedAt: FieldValue.serverTimestamp(),
    });
    await notify({
      type: "invoice.overdue",
      title: "Faktura po splatnosti",
      body: `${inv.number} nebyla zaplacena do splatnosti`,
      href: `/fakturace/${invDoc.id}`,
      entityType: "invoice",
      entityId: invDoc.id,
    });
    summary.overdue++;
  }

  // 3) Synchronizace stavu zaplacení z Fakturoidu.
  if (isFakturoidConfigured()) {
    const openSnap = await db
      .collection("invoices")
      .where("status", "in", ["sent", "overdue"])
      .get();

    for (const invDoc of openSnap.docs) {
      const inv = invDoc.data();
      if (!inv.fakturoidId) continue;
      try {
        const fk = await getInvoice(inv.fakturoidId);
        await invDoc.ref.update({ fakturoidStatus: fk.status });
        if (fk.status === "paid") {
          const paidAt = fk.paid_on ? new Date(fk.paid_on) : now;
          await markInvoicePaid(db, invDoc.id, inv, "system-fakturoid", paidAt);
          summary.paidSynced++;
        }
      } catch {
        // jednu fakturu přeskoč, cron nesmí spadnout celý
      }
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
