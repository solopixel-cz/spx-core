import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { TasksPageClient } from "@/components/tasks/tasks-page-client";

export default async function UkolyPage() {
  const user = await requireAuth();
  const db = getAdminFirestore();

  const [tasksSnap, usersSnap, clientsSnap] = await Promise.all([
    db.collection("tasks").orderBy("createdAt", "desc").get(),
    db.collection("users").where("active", "==", true).get(),
    db.collection("clients").get(),
  ]);

  const tasks = tasksSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title as string,
      description: data.description as string | undefined,
      clientId: data.clientId as string | undefined,
      assigneeUid: data.assigneeUid as string,
      dueAt: data.dueAt?.toDate?.()?.toISOString() ?? null,
      status: data.status as string,
      recurrence: data.recurrence as string | undefined,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  const users = usersSnap.docs.map((doc) => ({
    id: doc.id,
    displayName: doc.data().displayName as string,
  }));

  const clients = clientsSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((doc) => ({
      id: doc.id,
      name: doc.data().name as string,
    }));

  return (
    <TasksPageClient
      tasks={tasks}
      users={users}
      clients={clients}
      currentUid={user.uid}
    />
  );
}
