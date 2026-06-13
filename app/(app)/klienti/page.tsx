import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/auth";
import { ClientsPageClient } from "@/components/clients/clients-page-client";

interface ClientRow {
  id: string;
  name: string;
  company?: string;
  email: string;
  status: string;
  advisorSlug: string;
  instanceCount: number;
  updatedAt: string | null;
}

export default async function KlientiPage() {
  const user = await requireAuth();
  const db = getAdminFirestore();
  const isSales = user.role === "sales";

  const [clientsSnap, instancesSnap] = await Promise.all([
    isSales
      ? db.collection("clients").where("salesOwnerUid", "==", user.uid).orderBy("createdAt", "desc").get()
      : db.collection("clients").orderBy("createdAt", "desc").get(),
    db.collection("instances").get(),
  ]);

  // Count instances per client
  const instanceCounts: Record<string, number> = {};
  instancesSnap.docs.forEach((doc) => {
    const clientId = doc.data().clientId;
    instanceCounts[clientId] = (instanceCounts[clientId] || 0) + 1;
  });

  const clients: ClientRow[] = clientsSnap.docs.filter((d) => !d.data().deletedAt).map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      company: data.company,
      email: data.email,
      status: data.status,
      advisorSlug: data.advisorSlug,
      instanceCount: instanceCounts[doc.id] || 0,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  return <ClientsPageClient clients={clients} />;
}
