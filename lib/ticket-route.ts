import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSalesClientIds } from "@/lib/sales-clients";
import { toIso } from "@/lib/archive-view";

export interface TicketDetail {
  id: string;
  clientId: string;
  clientName: string;
  instanceId?: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigneeUid?: string;
  links: string[];
  createdAt: string | null;
  deletedAt: string | null;
}

/** Ticket pro routu `/tickets/[id]/...` se stejným guardem jako seznam (sales jen tickety vlastních klientů). */
export async function loadTicketForRoute(id: string) {
  const user = await requireAuth();
  const db = getAdminFirestore();
  const doc = await db.collection("tickets").doc(id).get();
  const t = doc.data();
  if (!t) notFound();

  const owned = await getSalesClientIds(user.uid, user.role);
  if (owned && !owned.has(t.clientId as string)) notFound();

  const clientDoc = await db.collection("clients").doc(t.clientId as string).get();
  const ticket: TicketDetail = {
    id: doc.id,
    clientId: t.clientId as string,
    clientName: (clientDoc.data()?.name as string | undefined) ?? "—",
    instanceId: t.instanceId as string | undefined,
    type: t.type as string,
    title: t.title as string,
    description: (t.description as string | undefined) ?? "",
    priority: t.priority as string,
    status: t.status as string,
    assigneeUid: t.assigneeUid as string | undefined,
    links: (t.links as string[] | undefined) ?? [],
    createdAt: toIso(t.createdAt),
    deletedAt: toIso(t.deletedAt),
  };
  return { user, db, ticket };
}

/** Návrat z ticketu: z detailu klienta (`?from=client`) zpět na jeho záložku, jinak na seznam. */
export function ticketBack(ticket: { clientId: string; clientName: string }, from?: string) {
  if (from === "client") {
    const href = `/clients/${ticket.clientId}?tab=tickety`;
    return {
      href,
      crumbs: [
        { label: "Klienti", href: "/clients" },
        { label: ticket.clientName, href },
      ],
    };
  }
  return { href: "/tickets", crumbs: [{ label: "Tickety", href: "/tickets" }] };
}
