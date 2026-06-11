import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { ClientDetailClient } from "@/components/clients/client-detail-client";

interface ClientData {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  status: string;
  advisorSlug: string;
  notes?: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface InstanceData {
  id: string;
  clientId: string;
  advisorSlug: string;
  domain: string;
  status: string;
  version: string;
  repoUrl?: string;
  deployUrl?: string;
  features: string[];
  notes?: string;
}

interface ActivityData {
  id: string;
  kind: string;
  text: string;
  actorUid: string;
  createdAt: string | null;
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const db = getAdminFirestore();

  const doc = await db.collection("clients").doc(id).get();
  if (!doc.exists) notFound();

  const data = doc.data()!;
  const client: ClientData = {
    id: doc.id,
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.phone,
    status: data.status,
    advisorSlug: data.advisorSlug,
    notes: data.notes,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
  };

  // Fetch instances
  const instancesSnap = await db
    .collection("instances")
    .where("clientId", "==", id)
    .orderBy("createdAt", "desc")
    .get();

  const instances: InstanceData[] = instancesSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as InstanceData[];

  // Fetch activity
  const activitySnap = await db
    .collection("activity")
    .where("entityType", "==", "client")
    .where("entityId", "==", id)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const activities: ActivityData[] = activitySnap.docs.map((d) => ({
    id: d.id,
    kind: d.data().kind,
    text: d.data().text,
    actorUid: d.data().actorUid,
    createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
  }));

  return (
    <ClientDetailClient
      client={client}
      instances={instances}
      activities={activities}
    />
  );
}
