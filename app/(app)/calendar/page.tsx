import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { addDays, loadCalendarEvents, pragueDay } from "@/lib/calendar";
import { SOON_DAYS } from "@/lib/calendar-digest";
import { CalendarPageClient } from "@/components/calendar/calendar-page-client";

/** Dny mřížky měsíce `YYYY-MM`: od pondělí před prvním dnem do neděle po posledním. */
function monthGrid(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const start = addDays(first.toISOString().slice(0, 10), -((first.getUTCDay() + 6) % 7));
  const end = addDays(last.toISOString().slice(0, 10), (7 - last.getUTCDay()) % 7);
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const user = await requireRole("admin", "member");
  const today = pragueDay(new Date());
  const { m, d } = await searchParams;
  // `d` = vybraný den (odkaz z dashboardu), `m` = měsíc.
  const day = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  const month = day ? day.slice(0, 7) : m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : today.slice(0, 7);
  const days = monthGrid(month);
  const to = [days.at(-1)!, addDays(today, SOON_DAYS)].sort().at(-1)!;

  const db = getAdminFirestore();
  const [events, feedSnap, userDoc, runDoc] = await Promise.all([
    loadCalendarEvents(db, { from: [days[0], today].sort()[0], to }),
    db.collection("calendarFeeds").where("uid", "==", user.uid).limit(1).get(),
    db.collection("users").doc(user.uid).get(),
    db.collection("settings").doc("calendar").get(),
  ]);
  const run = runDoc.data();

  return (
    <CalendarPageClient
      key={`${month}_${day ?? ""}`}
      month={month}
      initialDay={day}
      today={today}
      days={days}
      events={events}
      feedToken={feedSnap.docs[0]?.id ?? null}
      digestEmail={userDoc.data()?.calendarDigestEmail !== false}
      email={user.email ?? null}
      lastRunAt={run?.lastRunAt?.toDate?.()?.toISOString() ?? null}
    />
  );
}
