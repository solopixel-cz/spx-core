import { redirect } from "next/navigation";
import { loadTicketForRoute, ticketBack } from "@/lib/ticket-route";
import { loadInstanceOptions, loadUserAndClientOptions } from "@/lib/form-options";
import { FormPage } from "@/components/form-page";
import { TicketForm } from "@/components/tickets/ticket-form";

export default async function EditTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const { user, db, ticket } = await loadTicketForRoute(id);
  const detailHref = `/tickets/${id}${from ? `?from=${from}` : ""}`;
  if (ticket.deletedAt) redirect(detailHref);

  const back = ticketBack(ticket, from);
  const { users, clients } = await loadUserAndClientOptions(db, user);
  const instances = await loadInstanceOptions(db, new Set(clients.map((c) => c.id)));

  return (
    <FormPage
      backHref={detailHref}
      breadcrumbs={[...back.crumbs, { label: ticket.title, href: detailHref }, { label: "Upravit" }]}
      title="Upravit ticket"
    >
      <TicketForm
        ticket={ticket}
        clients={clients}
        users={users}
        instances={instances}
        backHref={detailHref}
      />
    </FormPage>
  );
}
