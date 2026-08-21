import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { TicketsPageClient } from "@/components/tickets/tickets-page-client";
import { getSalesClientIds } from "@/lib/sales-clients";

export default async function TicketyPage() {
  const user = await requireAuth();
  const db = getAdminFirestore();

  const [ticketsSnap, clientsSnap, usersSnap] = await Promise.all([
    db.collection("tickets").orderBy("createdAt", "desc").get(),
    db.collection("clients").get(),
    db.collection("users").where("active", "==", true).get(),
  ]);

  const ownedClientIds = await getSalesClientIds(user.uid, user.role);

  const clientMap: Record<string, string> = {};
  clientsSnap.docs.forEach((doc) => {
    clientMap[doc.id] = doc.data().name;
  });

  const filteredTickets = ticketsSnap.docs.filter((doc) => {
    if (doc.data().deletedAt) return false;
    if (!ownedClientIds) return true;
    return ownedClientIds.has(doc.data().clientId as string);
  });

  const tickets = filteredTickets.map((doc) => {
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
      links: (data.links as string[] | undefined) ?? [],
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  // For sales, only show own clients in the client dropdown
  const clients = clientsSnap.docs
    .filter((doc) => !doc.data().deletedAt && (!ownedClientIds || ownedClientIds.has(doc.id)))
    .map((doc) => ({
      id: doc.id,
      name: doc.data().name as string,
    }));

  const users = usersSnap.docs.map((doc) => ({
    id: doc.id,
    displayName: doc.data().displayName as string,
  }));

  return <TicketsPageClient tickets={tickets} clients={clients} users={users} />;
}
