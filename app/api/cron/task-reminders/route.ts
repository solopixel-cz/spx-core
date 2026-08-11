import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { notifyUsers } from "@/lib/notifications";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Ranní připomínka úkolů (Vercel Cron → GET). Chráněno CRON_SECRET.
 * Projde otevřené úkoly s termínem dnes a notifikuje jejich řešitele
 * (in-app + Web Push). Běží jednou denně ráno, takže každý úkol dostane
 * připomínku právě v den svého termínu.
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
  // Termíny se ukládají jako půlnoc UTC zvoleného dne → porovnáváme v UTC dni.
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const snap = await db.collection("tasks").where("status", "==", "open").get();
  let notified = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const dueAt = d.dueAt?.toDate?.();
    if (!dueAt || dueAt < start || dueAt > end) continue;
    if (!d.assigneeUid) continue;
    await notifyUsers([d.assigneeUid as string], {
      type: "task.due",
      title: "Úkol na dnes",
      body: `Dnes máš termín úkolu „${d.title}"`,
      href: "/ukoly",
      entityType: "task",
      entityId: doc.id,
    });
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
