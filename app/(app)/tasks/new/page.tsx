import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { loadUserAndClientOptions } from "@/lib/form-options";
import { FormPage } from "@/components/form-page";
import { TaskForm } from "@/components/tasks/task-form";

/** Nový úkol. S `?clientId=` (z detailu klienta) je klient předvyplněný a návrat vede zpět na klienta. */
export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const user = await requireAuth();
  const { clientId } = await searchParams;
  const db = getAdminFirestore();
  const { users, clients } = await loadUserAndClientOptions(db, user);

  const client = clientId ? clients.find((c) => c.id === clientId) : undefined;
  const backHref = client ? `/clients/${client.id}?tab=ukoly` : "/tasks";

  return (
    <FormPage
      backHref={backHref}
      breadcrumbs={
        client
          ? [
              { label: "Klienti", href: "/clients" },
              { label: client.name, href: backHref },
              { label: "Nový úkol" },
            ]
          : [{ label: "Úkoly", href: "/tasks" }, { label: "Nový úkol" }]
      }
      title="Nový úkol"
    >
      <TaskForm
        users={users}
        clients={clients}
        currentUid={user.uid}
        defaultClientId={client?.id}
        backHref={backHref}
      />
    </FormPage>
  );
}
