import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSalesClientIds } from "@/lib/sales-clients";
import { toIso } from "@/lib/archive-view";
import type { TicketFile } from "@/lib/schemas/ticket";
import { INTERNAL_LABEL } from "@/lib/ticket-labels";

export interface TicketDetail {
  id: string;
  /** null = interní ticket. */
  clientId: string | null;
  clientName: string;
  instanceId?: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigneeUid?: string;
  links: string[];
  /** Odkazy na pull requesty. */
  prLinks: string[];
  attachments: TicketFile[];
  /** `hub` = zpětná vazba od klienta z HUBu (klient vidí stav a vlákno). */
  source: "crm" | "hub";
  createdByEmail: string | null;
  unreadByTeam: boolean;
  /** Poslední ruční e-mail klientovi ke stavu (tlačítko v detailu). */
  clientNotified: { status: string; at: string | null } | null;
  /** Kdo ticket založil: člen týmu, u HUBu e-mail klienta. */
  createdByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
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

/** Ticket pro routu `/backlog/[id]/...` se stejným guardem jako seznam (sales jen tickety vlastních klientů). */
export async function loadTicketForRoute(id: string) {
  const user = await requireAuth();
  const db = getAdminFirestore();
  const doc = await db.collection("tickets").doc(id).get();
  const t = doc.data();
  if (!t) notFound();

  const owned = await getSalesClientIds(user.uid, user.role);
  if (owned && !owned.has(t.clientId as string)) notFound();

  const clientId = (t.clientId as string | undefined) || null;
  const clientDoc = clientId ? await db.collection("clients").doc(clientId).get() : null;
  const ticket: TicketDetail = {
    id: doc.id,
    clientId,
    clientName: clientId ? ((clientDoc?.data()?.name as string | undefined) ?? "—") : INTERNAL_LABEL,
    instanceId: t.instanceId as string | undefined,
    type: t.type as string,
    title: t.title as string,
    description: (t.description as string | undefined) ?? "",
    priority: t.priority as string,
    status: t.status as string,
    assigneeUid: t.assigneeUid as string | undefined,
    links: (t.links as string[] | undefined) ?? [],
    prLinks: (t.prLinks as string[] | undefined) ?? [],
    // Starší tickety mají v attachments prázdné pole (dřív Storage cesty, nikdy nevyužité).
    attachments: ((t.attachments as unknown[] | undefined) ?? []).filter(
      (f): f is TicketFile => typeof f === "object" && f !== null && "url" in f
    ),
    source: t.source === "hub" ? "hub" : "crm",
    createdByEmail: (t.createdByEmail as string | undefined) ?? null,
    unreadByTeam: t.unreadByTeam === true,
    clientNotified: t.clientNotified
      ? { status: t.clientNotified.status as string, at: toIso(t.clientNotified.at) }
      : null,
    createdByName: null,
    createdAt: toIso(t.createdAt),
    updatedAt: toIso(t.updatedAt),
    deletedAt: toIso(t.deletedAt),
  };
  if (t.source === "hub") ticket.createdByName = ticket.createdByEmail;
  else if (t.createdBy) {
    const author = await db.collection("users").doc(t.createdBy as string).get();
    ticket.createdByName = (author.data()?.displayName as string | undefined) ?? null;
  }
  return { user, db, ticket };
}

/**
 * Vše pro detail ticketu (stránka `/backlog/[id]` i modál nad nástěnkou):
 * ticket, vlákno, vizitka, tým pro výběr řešitele. Otevřením se ticket od
 * klienta označí jako přečtený (štítek „Nové“ zmizí).
 */
export async function loadTicketView(id: string) {
  const { user, db, ticket } = await loadTicketForRoute(id);
  const [usersSnap, instanceDoc, messages] = await Promise.all([
    db.collection("users").where("active", "==", true).get(),
    ticket.instanceId ? db.collection("instances").doc(ticket.instanceId).get() : null,
    ticket.source === "hub" ? loadTicketMessages(db, id) : [],
  ]);
  if (ticket.unreadByTeam) await db.collection("tickets").doc(id).update({ unreadByTeam: false });
  const users = usersSnap.docs
    .map((d) => ({ id: d.id, name: (d.data().displayName as string | undefined) || "Bez jména" }))
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));
  return {
    user,
    ticket,
    messages,
    users,
    instanceDomain: (instanceDoc?.data()?.domain as string | undefined) ?? null,
  };
}

/** Návrat z ticketu: z detailu klienta (`?from=client`) zpět na jeho záložku, jinak na Backlog (i `?from=board` z modálu). */
export function ticketBack(ticket: { clientId: string | null; clientName: string }, from?: string) {
  if (from === "client" && ticket.clientId) {
    const href = `/clients/${ticket.clientId}?tab=tickety`;
    return {
      href,
      crumbs: [
        { label: "Klienti", href: "/clients" },
        { label: ticket.clientName, href },
      ],
    };
  }
  return { href: "/backlog", crumbs: [{ label: "Backlog", href: "/backlog" }] };
}
