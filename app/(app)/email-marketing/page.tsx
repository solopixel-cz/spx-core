import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { statusOrder } from "@/lib/schemas/email-status";
import { EmailMarketingClient } from "@/components/email-marketing/email-marketing-client";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export default async function EmailMarketingPage() {
  await requireRole("admin", "member");
  const db = getAdminFirestore();

  const [tplSnap, listSnap, prospectsSnap, clientsSnap, campSnap, campEmailSnap] =
    await Promise.all([
      db.collection("emailTemplates").orderBy("updatedAt", "desc").get(),
      db.collection("marketingLists").orderBy("updatedAt", "desc").get(),
      db.collection("prospects").get(),
      db.collection("clients").get(),
      db.collection("campaigns").orderBy("createdAt", "desc").get(),
      db.collection("campaignEmails").get(),
    ]);

  const templates = tplSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name as string,
        subject: (d.subject as string) ?? null,
        updatedAt: serializeTimestamp(d.updatedAt),
      };
    });

  const lists = listSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((doc) => {
      const d = doc.data();
      const prospectIds = (d.prospectIds as string[]) ?? [];
      const clientIds = (d.clientIds as string[]) ?? [];
      return {
        id: doc.id,
        name: d.name as string,
        description: (d.description as string) ?? null,
        memberCount: prospectIds.length + clientIds.length,
        updatedAt: serializeTimestamp(d.updatedAt),
      };
    });

  // Agregace statusů e-mailů: celkově (přehled) i per kampaň
  const overview = { sent: 0, delivered: 0, opened: 0, clicked: 0 };
  const perCampaign = new Map<string, { delivered: number; opened: number; clicked: number }>();
  campEmailSnap.docs.forEach((doc) => {
    const d = doc.data();
    const order = statusOrder[d.status as string] ?? 0;
    overview.sent++;
    const cid = d.campaignId as string;
    const s = perCampaign.get(cid) ?? { delivered: 0, opened: 0, clicked: 0 };
    if (order >= statusOrder.delivered && order <= statusOrder.clicked) {
      overview.delivered++;
      s.delivered++;
    }
    if (order >= statusOrder.opened && order <= statusOrder.clicked) {
      overview.opened++;
      s.opened++;
    }
    if (order >= statusOrder.clicked && order <= statusOrder.clicked) {
      overview.clicked++;
      s.clicked++;
    }
    perCampaign.set(cid, s);
  });

  const campaigns = campSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((doc) => {
      const d = doc.data();
      const s = perCampaign.get(doc.id) ?? { delivered: 0, opened: 0, clicked: 0 };
      return {
        id: doc.id,
        name: d.name as string,
        templateName: (d.templateName as string) ?? null,
        listName: (d.listName as string) ?? null,
        status: d.status as string,
        totalRecipients: (d.totalRecipients as number) ?? 0,
        sentCount: (d.sentCount as number) ?? 0,
        opened: s.opened,
        clicked: s.clicked,
        sentAt: serializeTimestamp(d.sentAt),
      };
    });

  const contactsCount =
    prospectsSnap.docs.filter((d) => !d.data().deletedAt).length +
    clientsSnap.docs.filter((d) => !d.data().deletedAt).length;
  const membersInLists = lists.reduce((sum, l) => sum + l.memberCount, 0);

  return (
    <EmailMarketingClient
      templates={templates}
      lists={lists}
      campaigns={campaigns}
      counts={{
        templates: templates.length,
        lists: lists.length,
        contacts: contactsCount,
        membersInLists,
        campaigns: campaigns.length,
      }}
      overview={overview}
    />
  );
}
