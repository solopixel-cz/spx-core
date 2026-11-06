import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSalesClientIds } from "@/lib/sales-clients";
import { toIso } from "@/lib/archive-view";
import type { TicketFile } from "@/lib/schemas/ticket";

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
  attachments: TicketFile[];
  /** `hub` = zpětná vazba od klienta z HUBu (klient vidí stav a vlákno). */
  source: "crm" | "hub";
  createdByEmail: string | null;
  unreadByTeam: boolean;
  createdAt: string | null;
  deletedAt: string | null;
}

export interface TicketMessage {
  id: string;
  from: "client" | "team";
  authorName: string;
  text: string;
  attachments: TicketFile[];
  createdAt: string | null;
}

/** Vlákno ticketu z HUBu, od nejstarší zprávy. */
export async function loadTicketMessages(db: FirebaseFirestore.Firestore, id: string): Promise<TicketMessage[]> {
  const snap = await db.collection("tickets").doc(id).collection("messages").orderBy("createdAt", "asc").get();
  return snap.docs.map((doc) => {
    const m = doc.data();
    return {
      id: doc.id,
      from: m.from === "team" ? "team" : "client",
      authorName: (m.authorName as string | undefined) ?? "",
      text: (m.text as string | undefined) ?? "",
      attachments: (m.attachments as TicketFile[] | undefined) ?? [],
      createdAt: toIso(m.createdAt),
    };
  });
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
    // Starší tickety mají v attachments prázdné pole (dřív Storage cesty, nikdy nevyužité).
    attachments: ((t.attachments as unknown[] | undefined) ?? []).filter(
      (f): f is TicketFile => typeof f === "object" && f !== null && "url" in f
    ),
    source: t.source === "hub" ? "hub" : "crm",
    createdByEmail: (t.createdByEmail as string | undefined) ?? null,
    unreadByTeam: t.unreadByTeam === true,
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
