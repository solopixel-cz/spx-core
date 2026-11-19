import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { addDays, KIND_LABELS, loadCalendarEvents, pragueDay } from "@/lib/calendar";
import { buildIcs } from "@/lib/calendar-ics";

export const dynamic = "force-dynamic";

/**
 * Odběr kalendáře CRM (ICS) pro Google Kalendář. Bez přihlášení, přístup dává
 * soukromý token z `calendarFeeds` (každý uživatel svůj, jde vyměnit). Odkaz
 * přestane fungovat, když uživatel token zruší nebo přijde o přístup.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getAdminFirestore();
  const feed = /^[0-9a-f]{48}$/.test(token) ? await db.collection("calendarFeeds").doc(token).get() : null;
  const uid = feed?.data()?.uid as string | undefined;
  const user = uid ? (await db.collection("users").doc(uid).get()).data() : undefined;
  if (!user || user.active === false || !["admin", "member"].includes(user.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const today = pragueDay(new Date());
  const events = await loadCalendarEvents(db, { from: addDays(today, -90), to: addDays(today, 400) });
  const origin = request.nextUrl.origin;

  const body = buildIcs(
    events.map((e) => ({
      uid: `${e.id}@spx-core`,
      day: e.day,
      summary: `${e.state === "done" ? "✓ " : ""}${e.title}`,
      description: [KIND_LABELS[e.kind], e.detail, `${origin}${e.action?.href ?? e.href}`].join("\n"),
      url: `${origin}${e.action?.href ?? e.href}`,
    }))
  );

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="solopixel-crm.ics"',
      "Cache-Control": "no-store",
    },
  });
}
