import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { TicketsPageClient } from "@/components/tickets/tickets-page-client";

export default async function TicketyPage() {
  await requireAuth();
  const db = getAdminFirestore();

  const [ticketsSnap, clientsSnap, usersSnap] = await Promise.all([
    db.collection("tickets").orderBy("createdAt", "desc").get(),
    db.collection("clients").get(),
    db.collection("users").where("active", "==", true).get(),
  ]);

  const clientMap: Record<string, string> = {};
  clientsSnap.docs.forEach((doc) => {
    clientMap[doc.id] = doc.data().name;
  });

  const tickets = ticketsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      clientId: data.clientId as string,
      clientName: clientMap[data.clientId] ?? "—",
      type: data.type as string,
      title: data.title as string,
      description: data.description as string,
      priority: data.priority as string,
      status: data.status as string,
      assigneeUid: data.assigneeUid as string | undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  const clients = clientsSnap.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name as string,
  }));

  const users = usersSnap.docs.map((doc) => ({
    id: doc.id,
    displayName: doc.data().displayName as string,
  }));

  return <TicketsPageClient tickets={tickets} clients={clients} users={users} />;
}
