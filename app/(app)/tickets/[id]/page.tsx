import { loadTicketForRoute, loadTicketMessages, ticketBack } from "@/lib/ticket-route";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TicketDetailClient } from "@/components/tickets/ticket-detail-client";

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const { user, db, ticket } = await loadTicketForRoute(id);
  const back = ticketBack(ticket, from);

  const [assigneeDoc, instanceDoc, messages] = await Promise.all([
    ticket.assigneeUid ? db.collection("users").doc(ticket.assigneeUid).get() : null,
    ticket.instanceId ? db.collection("instances").doc(ticket.instanceId).get() : null,
    ticket.source === "hub" ? loadTicketMessages(db, id) : [],
  ]);
  // Otevřením detailu tým zprávu od klienta přečetl (štítek „Nové“ v seznamu zmizí).
  if (ticket.unreadByTeam) await db.collection("tickets").doc(id).update({ unreadByTeam: false });

  return (
    <div className="space-y-6">
      <Breadcrumbs backHref={back.href} items={[...back.crumbs, { label: ticket.title }]} />
      <TicketDetailClient
        ticket={ticket}
        messages={messages}
        assigneeName={(assigneeDoc?.data()?.displayName as string | undefined) ?? null}
        instanceDomain={(instanceDoc?.data()?.domain as string | undefined) ?? null}
        editHref={`/tickets/${id}/edit${from ? `?from=${from}` : ""}`}
        backHref={back.href}
        canArchive={user.role !== "sales"}
      />
    </div>
  );
}
