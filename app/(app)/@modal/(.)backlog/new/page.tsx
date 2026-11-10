import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { loadInstanceOptions, loadUserAndClientOptions } from "@/lib/form-options";
import { FormModal } from "@/components/form-modal";
import { TicketForm } from "@/components/tickets/ticket-form";

/**
 * Nový ticket jako modál: přechod na `/backlog/new` z aplikace (Backlog,
 * klient, nástěnka). Bez této routy by `/backlog/new` zachytil modál detailu
 * jako ticket s ID „new“. Při načtení adresy napřímo se ukáže stránka.
 */
export default async function NewTicketModalPage({
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

  return (
    <FormModal
      title="Nový ticket"
      pageHref={client ? `/backlog/new?clientId=${client.id}` : "/backlog/new"}
      className="sm:max-w-3xl"
    >
      <TicketForm
        clients={clients}
        users={users}
        instances={instances}
        defaultClientId={client?.id}
        allowInternal={user.role !== "sales"}
        backHref="/backlog"
      />
    </FormModal>
  );
}
