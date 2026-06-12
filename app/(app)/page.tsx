import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const user = await requireAuth();
  const db = getAdminFirestore();

  const [leadsSnap, invoicesSnap, ticketsSnap, tasksSnap, submissionsSnap] = await Promise.all([
    db.collection("leads").get(),
    db.collection("invoices").get(),
    db.collection("tickets").where("status", "in", ["open", "in_progress", "waiting_client"]).get(),
    db.collection("tasks").where("assigneeUid", "==", user.uid).where("status", "==", "open").get(),
    db.collection("card-submissions").get(),
  ]);

  // Lead funnel
  const leadsByStage: Record<string, number> = {};
  leadsSnap.docs.forEach((doc) => {
    const stage = doc.data().stage as string;
    leadsByStage[stage] = (leadsByStage[stage] || 0) + 1;
  });

  // Overdue invoices
  const now = new Date();
  const overdueInvoices = invoicesSnap.docs.filter((doc) => {
    const data = doc.data();
    const dueAt = data.dueAt?.toDate?.();
    return data.status === "sent" && dueAt && dueAt < now;
  });

  // Tickets by priority
  const ticketsByPriority: Record<string, number> = {};
  ticketsSnap.docs.forEach((doc) => {
    const priority = doc.data().priority as string;
    ticketsByPriority[priority] = (ticketsByPriority[priority] || 0) + 1;
  });

  // My tasks
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const myTasks = tasksSnap.docs.map((doc) => {
    const data = doc.data();
    const dueAt = data.dueAt?.toDate?.();
    return {
      id: doc.id,
      title: data.title as string,
      dueAt: dueAt?.toISOString() ?? null,
      isOverdue: dueAt ? dueAt < now : false,
      isDueToday: dueAt ? dueAt <= today && dueAt >= new Date(now.toDateString()) : false,
    };
  });

  return (
    <DashboardClient
      leadsByStage={leadsByStage}
      overdueInvoiceCount={overdueInvoices.length}
      overdueInvoiceSum={overdueInvoices.reduce((s, d) => s + (d.data().amount as number), 0)}
      ticketsByPriority={ticketsByPriority}
      openTicketCount={ticketsSnap.size}
      myTasks={myTasks}
      newSubmissionsCount={submissionsSnap.docs.filter((d) => !d.data().processedAt).length}
    />
  );
}
