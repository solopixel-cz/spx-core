import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { LeadsPageClient } from "@/components/leads/leads-page-client";

export default async function LeadyPage() {
  const user = await requireAuth();
  const db = getAdminFirestore();

  const [leadsSnap, usersSnap] = await Promise.all([
    db.collection("leads").orderBy("updatedAt", "desc").get(),
    db.collection("users").where("active", "==", true).get(),
  ]);

  const leads = leadsSnap.docs.filter((d) => !d.data().deletedAt).map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name as string,
      company: data.company as string | undefined,
      email: data.email as string | undefined,
      phone: data.phone as string | undefined,
      source: data.source as string,
      stage: data.stage as string,
      value: data.value as number | undefined,
      ownerUid: data.ownerUid as string,
      lostReason: data.lostReason as string | undefined,
      notes: data.notes as string | undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  const users = usersSnap.docs.map((doc) => ({
    id: doc.id,
    displayName: doc.data().displayName as string,
    email: doc.data().email as string,
  }));

  return (
    <LeadsPageClient
      leads={leads}
      users={users}
      currentUid={user.uid}
    />
  );
}
