import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { NewCampaignClient } from "@/components/email-marketing/new-campaign-client";

export default async function NewCampaignPage() {
  await requireRole("admin", "member");
  const db = getAdminFirestore();

  const [tplSnap, listSnap] = await Promise.all([
    db.collection("emailTemplates").orderBy("updatedAt", "desc").get(),
    db.collection("marketingLists").orderBy("updatedAt", "desc").get(),
  ]);

  const templates = tplSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((doc) => ({ id: doc.id, name: doc.data().name as string }));

  const lists = listSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((doc) => {
      const d = doc.data();
      const count = ((d.prospectIds as string[]) ?? []).length + ((d.clientIds as string[]) ?? []).length;
      return { id: doc.id, name: d.name as string, memberCount: count };
    });

  return <NewCampaignClient templates={templates} lists={lists} />;
}
