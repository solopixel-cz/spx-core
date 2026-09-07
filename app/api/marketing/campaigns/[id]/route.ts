import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { statusOrder } from "@/lib/schemas/email-status";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin", "member");
    const { id } = await params;
    const db = getAdminFirestore();

    const doc = await db.collection("campaigns").doc(id).get();
    if (!doc.exists || doc.data()?.deletedAt) {
      return NextResponse.json({ error: "Kampaň nenalezena" }, { status: 404 });
    }
    const d = doc.data()!;

    const emailsSnap = await db
      .collection("campaignEmails")
      .where("campaignId", "==", id)
      .get();

    const stats = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 };
    const recipients = emailsSnap.docs.map((e) => {
      const ed = e.data();
      const status = ed.status as string;
      const order = statusOrder[status] ?? 0;
      stats.sent++;
      if (order >= statusOrder.delivered && order <= statusOrder.clicked) stats.delivered++;
      if (order >= statusOrder.opened && order <= statusOrder.clicked) stats.opened++;
      if (order >= statusOrder.clicked && order <= statusOrder.clicked) stats.clicked++;
      if (status === "bounced") stats.bounced++;
      return {
        id: e.id,
        toEmail: ed.toEmail as string,
        contactType: (ed.contactType as string) ?? null,
        status,
        sentAt: serializeTimestamp(ed.sentAt),
        lastEventAt: serializeTimestamp(ed.lastEventAt),
      };
    });

    recipients.sort((a, b) => a.toEmail.localeCompare(b.toEmail));

    return NextResponse.json({
      id: doc.id,
      name: d.name as string,
      templateName: (d.templateName as string) ?? null,
      listName: (d.listName as string) ?? null,
      subject: (d.subject as string) ?? null,
      status: d.status as string,
      totalRecipients: (d.totalRecipients as number) ?? 0,
      sentCount: (d.sentCount as number) ?? 0,
      failedCount: (d.failedCount as number) ?? 0,
      sentAt: serializeTimestamp(d.sentAt),
      stats,
      recipients,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
