import { loadTicketView, ticketBack } from "@/lib/ticket-route";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TicketDetailClient } from "@/components/tickets/ticket-detail-client";

/** Detail ticketu na vlastní stránce (sdílený odkaz, obnovení stránky). Z nástěnky se otevírá v modálu (@modal). */
export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const { user, ticket, messages, comments, users, knownTags, instanceDomain } = await loadTicketView(id);
  const back = ticketBack(ticket, from);

  return (
    <div className="space-y-6">
      <Breadcrumbs backHref={back.href} items={[...back.crumbs, { label: ticket.title }]} />
      <TicketDetailClient
        ticket={ticket}
        messages={messages}
        comments={comments}
        currentUid={user.uid}
        knownTags={knownTags}
        users={users}
        instanceDomain={instanceDomain}
        editHref={`/backlog/${id}/edit${from ? `?from=${from}` : ""}`}
        backHref={back.href}
        canArchive={user.role !== "sales"}
      />
    </div>
  );
}
