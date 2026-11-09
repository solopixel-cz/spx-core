import { loadTicketView } from "@/lib/ticket-route";
import { TicketModal } from "@/components/tickets/ticket-modal";
import { TicketDetailClient } from "@/components/tickets/ticket-detail-client";

/**
 * Detail ticketu jako modál: přechod na `/backlog/[id]` z aplikace (nástěnka,
 * seznam, klient, hledání). Při načtení adresy napřímo se ukáže stránka.
 */
export default async function TicketModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, ticket, messages, users, instanceDomain } = await loadTicketView(id);

  return (
    <TicketModal title={ticket.title}>
      <TicketDetailClient
        ticket={ticket}
        messages={messages}
        users={users}
        instanceDomain={instanceDomain}
        editHref={`/backlog/${id}/edit?from=board`}
        backHref="/backlog"
        canArchive={user.role !== "sales"}
        inModal
      />
    </TicketModal>
  );
}
