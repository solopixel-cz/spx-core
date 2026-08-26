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

  // Sales can only view their own clients
  if (isSales && doc.data()?.salesOwnerUid !== user.uid) notFound();

  const data = doc.data()!;
  const client = {
    id: doc.id,
    name: data.name as string,
    company: data.company as string | undefined,
    ico: data.ico as string | undefined,
    dic: data.dic as string | undefined,
    billingStreet: data.billingStreet as string | undefined,
    billingZip: data.billingZip as string | undefined,
    billingCity: data.billingCity as string | undefined,
    email: data.email as string,
    phone: data.phone as string | undefined,
    status: data.status as string,
    advisorSlug: data.advisorSlug as string,
    notes: data.notes as string | undefined,
    salesOwnerUid: (data.salesOwnerUid as string) ?? null,
    deletedAt: data.deletedAt?.toDate?.()?.toISOString() ?? null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
  };

  // Fetch instances, domains, activity, subscription, invoices in parallel
  const [instancesSnap, domainsSnap, activitySnap, subsSnap, invoicesSnap, tasksSnap, ticketsSnap, usersSnap, deliverySnap] =
    await Promise.all([
      db
        .collection("instances")
        .where("clientId", "==", id)
        .orderBy("createdAt", "desc")
        .get(),
      db
        .collection("domains")
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
      db
        .collection("deliveryEmails")
        .where("clientId", "==", id)
        .orderBy("sentAt", "desc")
        .limit(1)
        .get(),
    ]);

  const instances = instancesSnap.docs.filter((d) => !d.data().deletedAt).map((d) => ({
    id: d.id,
    clientId: d.data().clientId as string,
    type: (d.data().type as string) ?? "card",
    advisorSlug: (d.data().advisorSlug as string | undefined) ?? "",
    hosting: (d.data().hosting as string | undefined) ?? undefined,
    domain: d.data().domain as string,
    status: d.data().status as string,
    repoUrl: d.data().repoUrl as string | undefined,
    deployUrl: d.data().deployUrl as string | undefined,
    features: (d.data().features ?? []) as string[],
    notes: d.data().notes as string | undefined,
  }));

  const domains = domainsSnap.docs.map((d) => ({
    id: d.id,
    clientId: d.data().clientId as string,
    name: d.data().name as string,
    registrar: (d.data().registrar as string | undefined) ?? null,
    account: (d.data().account as string | undefined) ?? null,
    hosting: (d.data().hosting as string | undefined) ?? null,
    purchasedAt: d.data().purchasedAt?.toDate?.()?.toISOString() ?? null,
    renewalAt: d.data().renewalAt?.toDate?.()?.toISOString() ?? null,
    autoRenew: (d.data().autoRenew as boolean | undefined) ?? false,
    note: (d.data().note as string | undefined) ?? null,
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
        internal: (subDoc.data().internal as boolean | undefined) ?? false,
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
      recurrence: tData.recurrence as string | undefined,
    };
  });

  const clientTickets = ticketsSnap.docs.filter((d) => !d.data().deletedAt).map((d) => {
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
    .filter((d) => d.data().active)
    .map((d) => ({ id: d.id, displayName: d.data().displayName as string }));

  const lastDeliveryDoc = deliverySnap.docs[0];
  const lastDelivery = lastDeliveryDoc
    ? {
        id: lastDeliveryDoc.id,
        sentAt: lastDeliveryDoc.data().sentAt?.toDate?.()?.toISOString() ?? null,
        status: lastDeliveryDoc.data().status as string,
      }
    : null;

  return (
    <ClientDetailClient
      client={client}
      instances={instances}
      domains={domains}
      activities={activities}
      subscription={subscription}
      invoices={invoices}
      tasks={clientTasks}
      tickets={clientTickets}
      salesUsers={salesUsers}
      userRole={user.role}
      currentUid={user.uid}
      lastDelivery={lastDelivery}
    />
  );
}
