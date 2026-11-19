import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { addDays, loadCalendarEvents, pragueDay } from "@/lib/calendar";
import { buildDigest, digestEmail, digestIsEmpty, digestSummary, DOMAIN_HEADS_UP_DAYS } from "@/lib/calendar-digest";
import { sendTransactionalEmail } from "@/lib/email";
import { notifyUsers } from "@/lib/notifications";
import { wantsNotification } from "@/lib/notification-prefs";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SENDER = "hello@solopixel.cz";

/**
 * Ranní souhrn z kalendáře (Vercel Cron → GET, chráněno CRON_SECRET). Každý
 * aktivní admin a member dostane svůj souhrn: notifikaci v CRM, push do
 * zařízení a e-mail (jde vypnout v Kalendáři, `users.calendarDigestEmail`).
 *
 * Spolehlivost: souhrn obsahuje i vše nedodělané z minulých dnů, takže
 * vynechaný den nic neztratí. `calendarDigests/{den}_{uid}` zajistí, že
 * opakované spuštění téhož dne nepošle souhrn dvakrát. Běh se zapíše do
 * `settings/calendar`, kalendář pak ukáže, kdy proběhla poslední kontrola.
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
  const today = pragueDay(new Date());
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin = productionHost ? `https://${productionHost}` : request.nextUrl.origin;

  const events = await loadCalendarEvents(db, { from: today, to: addDays(today, DOMAIN_HEADS_UP_DAYS) });
  const digest = buildDigest(events, today);
  const summary = { day: today, recipients: 0, emailed: 0, skipped: 0, errors: 0 };

  if (!digestIsEmpty(digest)) {
    const usersSnap = await db.collection("users").where("role", "in", ["admin", "member"]).get();
    for (const userDoc of usersSnap.docs) {
      const u = userDoc.data();
      if (u.active === false) continue;

      // Jednou denně: create() selže, když už dnešní souhrn existuje.
      const logRef = db.collection("calendarDigests").doc(`${today}_${userDoc.id}`);
      try {
        await logRef.create({
          uid: userDoc.id,
          day: today,
          overdue: digest.overdue.length,
          today: digest.today.length,
          soon: digest.soon.length,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch {
        summary.skipped++;
        continue;
      }
      summary.recipients++;

      // Zvoneček + push jen se zapnutým souhrnem (profil → Notifikace); e-mail má vlastní volbu.
      if (wantsNotification(u.notificationPrefs, "calendar.digest")) await notifyUsers([userDoc.id], {
        type: "calendar.digest",
        title: "Dnes v kalendáři",
        body: digestSummary(digest),
        href: "/calendar",
      });

      if (u.calendarDigestEmail === false || !u.email) continue;
      try {
        const mail = digestEmail(digest, today, origin, (u.displayName as string)?.split(" ")[0] || "");
        await sendTransactionalEmail({ to: u.email, senderName: "SoloPixel CRM", senderEmail: SENDER, ...mail });
        await logRef.update({ emailedAt: FieldValue.serverTimestamp() });
        summary.emailed++;
      } catch (error) {
        summary.errors++;
        await logRef.update({ emailError: error instanceof Error ? error.message : String(error) });
        console.error("[cron/calendar] e-mail", userDoc.id, error);
      }
    }
  }

  await db.collection("settings").doc("calendar").set(
    { lastRunAt: FieldValue.serverTimestamp(), lastRunDay: today, lastRun: summary },
    { merge: true }
  );
  return NextResponse.json({ ok: true, ...summary });
}
