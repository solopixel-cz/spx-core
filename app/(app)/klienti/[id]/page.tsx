import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { ClientDetailClient } from "@/components/clients/client-detail-client";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const isSales = user.role === "sales";
  const { id } = await params;
  const db = getAdminFirestore();

  const doc = await db.collection("clients").doc(id).get();
  if (!doc.exists) notFound();

  const data = doc.data()!;
  const client = {
    id: doc.id,
    name: data.name as string,
    company: data.company as string | undefined,
    ico: data.ico as string | undefined,
    dic: data.dic as string | undefined,
    email: data.email as string,
    phone: data.phone as string | undefined,
    status: data.status as string,
    advisorSlug: data.advisorSlug as string,
    notes: data.notes as string | undefined,
    salesOwnerUid: (data.salesOwnerUid as string) ?? null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
  };

  // Fetch instances, activity, subscription, invoices in parallel
  const [instancesSnap, activitySnap, subsSnap, invoicesSnap, tasksSnap, ticketsSnap, usersSnap] =
    await Promise.all([
      db
        .collection("instances")
        .where("clientId", "==", id)
        .orderBy("createdAt", "desc")
        .get(),
      db
        .collection("activity")
        .where("entityType", "==", "client")
        .where("entityId", "==", id)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get(),
      isSales ? Promise.resolve({ docs: [] }) : db.collection("subscriptions").where("clientId", "==", id).get(),
      isSales ? Promise.resolve({ docs: [] }) : db
        .collection("invoices")
        .where("clientId", "==", id)
        .orderBy("issuedAt", "desc")
        .get(),
      db.collection("tasks").where("clientId", "==", id).orderBy("createdAt", "desc").get(),
      db.collection("tickets").where("clientId", "==", id).orderBy("createdAt", "desc").get(),
      db.collection("users").get(),
    ]);

  const instances = instancesSnap.docs.map((d) => ({
    id: d.id,
    clientId: d.data().clientId as string,
    advisorSlug: d.data().advisorSlug as string,
    domain: d.data().domain as string,
    status: d.data().status as string,
    version: d.data().version as string,
    repoUrl: d.data().repoUrl as string | undefined,
    deployUrl: d.data().deployUrl as string | undefined,
    features: (d.data().features ?? []) as string[],
    notes: d.data().notes as string | undefined,
  }));

  const activities = activitySnap.docs.map((d) => ({
    id: d.id,
    kind: d.data().kind as string,
    text: d.data().text as string,
    actorUid: d.data().actorUid as string,
    createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
  }));

  const subDoc = subsSnap.docs[0];
  const subscription = subDoc
    ? {
        id: subDoc.id,
        plan: subDoc.data().plan as string,
        priceMonthly: subDoc.data().priceMonthly as number,
        billingCycle: subDoc.data().billingCycle as string,
        status: subDoc.data().status as string,
        startedAt:
          subDoc.data().startedAt?.toDate?.()?.toISOString() ?? null,
        nextInvoiceAt:
          subDoc.data().nextInvoiceAt?.toDate?.()?.toISOString() ?? null,
        discountPercent: (subDoc.data().discountPercent as number | undefined) ?? 0,
        discountNote: (subDoc.data().discountNote as string | undefined) ?? "",
      }
    : null;

  const now = new Date();
  const invoices = invoicesSnap.docs.map((d) => {
    const iData = d.data();
    const dueAt = iData.dueAt?.toDate?.() ?? null;
    let status = iData.status as string;
    if (status === "sent" && dueAt && dueAt < now) status = "overdue";
    return {
      id: d.id,
      clientId: iData.clientId as string,
      clientName: client.name,
      number: iData.number as string,
      amount: iData.amount as number,
      issuedAt: iData.issuedAt?.toDate?.()?.toISOString() ?? null,
      dueAt: dueAt?.toISOString() ?? null,
      paidAt: iData.paidAt?.toDate?.()?.toISOString() ?? null,
      status,
    };
  });

  const clientTasks = tasksSnap.docs.map((d) => {
    const tData = d.data();
    return {
      id: d.id,
      title: tData.title as string,
      status: tData.status as string,
      dueAt: tData.dueAt?.toDate?.()?.toISOString() ?? null,
      assigneeUid: tData.assigneeUid as string,
    };
  });

  const clientTickets = ticketsSnap.docs.map((d) => {
    const tData = d.data();
    return {
      id: d.id,
      type: tData.type as string,
      title: tData.title as string,
      priority: tData.priority as string,
      status: tData.status as string,
      createdAt: tData.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  const salesUsers = usersSnap.docs
    .filter((d) => d.data().role === "sales" && d.data().active)
    .map((d) => ({ id: d.id, displayName: d.data().displayName as string }));

  return (
    <ClientDetailClient
      client={client}
      instances={instances}
      activities={activities}
      subscription={subscription}
      invoices={invoices}
      tasks={clientTasks}
      tickets={clientTickets}
      salesUsers={salesUsers}
      userRole={user.role}
    />
  );
}
