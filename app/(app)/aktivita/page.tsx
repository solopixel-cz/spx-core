import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { AktivitaPageClient } from "@/components/activity/aktivita-page-client";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export default async function AktivitaPage() {
  const user = await requireAuth();
  const db = getAdminFirestore();
  const isSales = user.role === "sales";

  const [activitySnap, usersSnap] = await Promise.all([
    db.collection("activity").orderBy("createdAt", "desc").limit(50).get(),
    db.collection("users").get(),
  ]);

  const userMap: Record<string, string> = {};
  usersSnap.docs.forEach((doc) => {
    userMap[doc.id] = doc.data().displayName as string;
  });

  const users = usersSnap.docs.map((doc) => ({
    id: doc.id,
    displayName: doc.data().displayName as string,
  }));

  const activities = activitySnap.docs
    .filter((doc) => {
      if (isSales) {
        const et = doc.data().entityType as string;
        return et !== "invoice";
      }
      return true;
    })
    .map((doc) => {
      const d = doc.data();
      const et = d.entityType as string;
      const href =
        et === "client" ? `/klienti/${d.entityId}`
        : et === "lead" ? "/leady"
        : et === "ticket" ? "/tickety"
        : et === "prospect" ? "/prospekti"
        : "/fakturace";
      return {
        id: doc.id,
        actorUid: d.actorUid as string,
        actor: userMap[d.actorUid as string] ?? "Systém",
        entityType: et,
        entityId: d.entityId as string,
        kind: d.kind as string,
        text: d.text as string,
        href,
        createdAt: serializeTimestamp(d.createdAt),
      };
    });

  return (
    <AktivitaPageClient
      initialActivities={activities}
      users={users}
      userRole={user.role}
    />
  );
}
