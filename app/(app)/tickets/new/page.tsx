import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { loadInstanceOptions, loadUserAndClientOptions } from "@/lib/form-options";
import { FormPage } from "@/components/form-page";
import { TicketForm } from "@/components/tickets/ticket-form";

/** Nový ticket. S `?clientId=` (z detailu klienta) je klient předvyplněný a návrat vede zpět na klienta. */
export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const user = await requireAuth();
  const { clientId } = await searchParams;
  const db = getAdminFirestore();
  const { users, clients } = await loadUserAndClientOptions(db, user);
  const instances = await loadInstanceOptions(db, new Set(clients.map((c) => c.id)));

  const client = clientId ? clients.find((c) => c.id === clientId) : undefined;
  const backHref = client ? `/clients/${client.id}?tab=tickety` : "/tickets";

  return (
    <FormPage
      backHref={backHref}
      breadcrumbs={
        client
          ? [
              { label: "Klienti", href: "/clients" },
              { label: client.name, href: backHref },
              { label: "Nový ticket" },
            ]
          : [{ label: "Tickety", href: "/tickets" }, { label: "Nový ticket" }]
      }
      title="Nový ticket"
    >
      <TicketForm
        clients={clients}
        users={users}
        instances={instances}
        defaultClientId={client?.id}
        backHref={backHref}
      />
    </FormPage>
  );
}
