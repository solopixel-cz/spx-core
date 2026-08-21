import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { notify } from "@/lib/notifications";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Kolik dnů předem upozornit a jak často opakovat (throttle). */
const REMIND_WITHIN_DAYS = 30;
const THROTTLE_DAYS = 7;

/**
 * Denní připomínka blížícího se obnovení domén (Vercel Cron → GET). Chráněno
 * CRON_SECRET. Projde domény s `renewalAt` do 30 dnů (vč. po termínu), přeskočí
 * `autoRenew` a archivované klienty, a notifikuje adminy (in-app + Web Push).
 * Throttle přes `renewalReminderSentAt` — max jednou za 7 dnů na doménu; edit
 * termínu obnovení pole vynuluje, takže nový cyklus připomene znovu.
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
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const horizon = new Date(now.getTime() + REMIND_WITHIN_DAYS * 86400000);
  const throttleCutoff = new Date(now.getTime() - THROTTLE_DAYS * 86400000);

  const snap = await db.collection("domains").get();
  let notified = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.autoRenew) continue;
    const renewalAt = d.renewalAt?.toDate?.() as Date | undefined;
    if (!renewalAt || renewalAt > horizon) continue;

    // Throttle — přeskoč, pokud jsme připomněli nedávno.
    const lastReminder = d.renewalReminderSentAt?.toDate?.() as Date | undefined;
    if (lastReminder && lastReminder > throttleCutoff) continue;

    // Klient musí existovat a nesmí být archivovaný.
    const clientId = d.clientId as string;
    const clientDoc = await db.collection("clients").doc(clientId).get();
    if (!clientDoc.exists || clientDoc.data()?.deletedAt) continue;
    const clientName = clientDoc.data()?.name as string;

    const days = Math.round((renewalAt.getTime() - startToday.getTime()) / 86400000);
    const when =
      days < 0
        ? `po termínu (${Math.abs(days)} dní)`
        : days === 0
          ? "dnes"
          : `za ${days} dní`;

    await notify({
      type: "domain.renewal",
      title: "Obnovit doménu",
      body: `Doména ${d.name} (${clientName}) — obnovit ${when}`,
      href: `/clients/${clientId}`,
      entityType: "client",
      entityId: clientId,
    });

    await doc.ref.update({
      renewalReminderSentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
