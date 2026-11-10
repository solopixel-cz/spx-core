import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { TicketsPageClient } from "@/components/tickets/tickets-page-client";
import { getSalesClientIds } from "@/lib/sales-clients";
import { archivedQuery, byDeletedAtDesc, isArchiveView, toIso } from "@/lib/archive-view";
import { INTERNAL_LABEL } from "@/lib/ticket-labels";

/** Backlog: tickety od klientů (z HUBu i z CRM) a interní úkoly. Výchozí je nástěnka, `?view=list` tabulka. */
export default async function BacklogPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string; view?: string }>;
}) {
  const user = await requireAuth();
  const db = getAdminFirestore();
  const archived = await isArchiveView(searchParams, user.role);
  const { view } = await searchParams;

  const [ticketsSnap, clientsSnap, usersSnap] = await Promise.all([
    archived
      ? archivedQuery(db, "tickets").get()
      : db.collection("tickets").orderBy("createdAt", "desc").get(),
    db.collection("clients").get(),
    db.collection("users").where("active", "==", true).get(),
  ]);

  const ownedClientIds = await getSalesClientIds(user.uid, user.role);

  const clientMap: Record<string, string> = {};
  clientsSnap.docs.forEach((doc) => {
    clientMap[doc.id] = doc.data().name;
  });

  // Obchodník vidí jen tickety vlastních klientů, interní ne.
  const filteredTickets = ticketsSnap.docs.filter((doc) => {
    if (!!doc.data().deletedAt !== archived) return false;
    if (!ownedClientIds) return true;
    return ownedClientIds.has(doc.data().clientId as string);
  });

  const tickets = filteredTickets.map((doc) => {
    const data = doc.data();
    const clientId = (data.clientId as string | undefined) || null;
    return {
      id: doc.id,
      clientId,
      clientName: clientId ? (clientMap[clientId] ?? "—") : INTERNAL_LABEL,
      type: data.type as string,
      title: data.title as string,
      description: data.description as string,
      priority: data.priority as string,
      status: data.status as string,
      assigneeUid: data.assigneeUid as string | undefined,
      links: (data.links as string[] | undefined) ?? [],
      prCount: ((data.prLinks as string[] | undefined) ?? []).length,
      fromHub: data.source === "hub",
      unread: data.unreadByTeam === true,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
      deletedAt: toIso(data.deletedAt),
    };
  });
  if (archived) tickets.sort(byDeletedAtDesc);

  // For sales, only show own clients in the client dropdown
  const clients = clientsSnap.docs
    .filter((doc) => !doc.data().deletedAt && (!ownedClientIds || ownedClientIds.has(doc.id)))
    .map((doc) => ({
      id: doc.id,
      name: doc.data().name as string,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));

  const users = usersSnap.docs
    .map((doc) => ({ id: doc.id, name: (doc.data().displayName as string | undefined) || "Bez jména" }))
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));

  return (
    <TicketsPageClient
      tickets={tickets}
      clients={clients}
      users={users}
      currentUid={user.uid}
      showInternal={!ownedClientIds}
      view={archived || view === "list" ? "list" : "board"}
      canArchive={user.role !== "sales"}
      archived={archived}
    />
  );
}
