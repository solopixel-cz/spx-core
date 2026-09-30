import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { loadUserAndClientOptions } from "@/lib/form-options";
import { FormPage } from "@/components/form-page";
import { TaskForm } from "@/components/tasks/task-form";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const db = getAdminFirestore();

  const doc = await db.collection("tasks").doc(id).get();
  const t = doc.data();
  if (!t) notFound();
  // Hotové úkoly se neupravují (stejně jako v seznamu).
  if (t.status === "done") redirect("/tasks");

  const { users, clients } = await loadUserAndClientOptions(db, user);

  return (
    <FormPage
      backHref="/tasks"
      breadcrumbs={[{ label: "Úkoly", href: "/tasks" }, { label: t.title as string }]}
      title="Upravit úkol"
    >
      <TaskForm
        users={users}
        clients={clients}
        currentUid={user.uid}
        backHref="/tasks"
        task={{
          id: doc.id,
          title: t.title as string,
          description: t.description as string | undefined,
          clientId: t.clientId as string | undefined,
          assigneeUid: t.assigneeUid as string,
          dueAt: t.dueAt?.toDate?.()?.toISOString() ?? null,
          recurrence: t.recurrence as string | undefined,
          status: t.status as string,
        }}
      />
    </FormPage>
  );
}
