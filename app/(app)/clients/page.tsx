import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/auth";
import { subscriptionLabel } from "@/lib/plans";
import { archivedQuery, byDeletedAtDesc, isArchiveView, toIso, type ArchiveSearchParams } from "@/lib/archive-view";
import { ClientsPageClient, type ClientRow } from "@/components/clients/clients-page-client";
import { HUB_FEATURES, hubFeaturesFrom, type HubFeature } from "@/lib/hub-features";

export default async function KlientiPage({ searchParams }: { searchParams: ArchiveSearchParams }) {
  const user = await requireAuth();
  const db = getAdminFirestore();
  const isSales = user.role === "sales";
  const archived = await isArchiveView(searchParams, user.role);

  const [clientsSnap, instancesSnap, subsSnap, projectsSnap, usersSnap] = await Promise.all([
    archived
      ? archivedQuery(db, "clients").get()
      : isSales
      ? db.collection("clients").where("salesOwnerUid", "==", user.uid).orderBy("createdAt", "desc").get()
      : db.collection("clients").orderBy("createdAt", "desc").get(),
    db.collection("instances").get(),
    db.collection("subscriptions").get(),
    db.collection("projects").get(),
    db.collection("users").get(),
  ]);
  const userNames = new Map(usersSnap.docs.map((d) => [d.id, (d.data().displayName as string) || ""]));

  // Služby klienta: vizitky / weby (instances) + zakázky (projects), bez archivovaných.
  const services: Record<string, ClientRow["services"]> = {};
  const svc = (clientId: string) =>
    (services[clientId] ??= { cards: 0, webs: 0, projects: 0, openProjects: 0 });
  instancesSnap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.deletedAt) return;
    if (d.type === "web") svc(d.clientId).webs++;
    else svc(d.clientId).cards++;
  });
  projectsSnap.docs.forEach((doc) => {
    const d = doc.data();
    if (d.deletedAt || d.status === "cancelled") return;
    svc(d.clientId).projects++;
    if (d.status === "inquiry" || d.status === "in_progress") svc(d.clientId).openProjects++;
  });

  // Předplatná (klient jich může mít víc, fáze 34C). Platící = aspoň jedno nezrušené
  // a ne interní; Paušál = součet měsíčních cen po slevě (priceMonthly je vždy měsíční, i u roční fakturace).
  const paying: Record<string, { labels: string[]; monthly: number }> = {};
  const internalOnly = new Set<string>();
  // Přehledy (záložky): předplatné vizitky vs. jiné služby (web, správa…).
  const cardSub = new Set<string>();
  const otherSub = new Set<string>();
  subsSnap.docs.forEach((doc) => {
    const s = doc.data();
    if (s.status === "cancelled") return;
    const clientId = s.clientId as string;
    ((s.service ?? "card") === "card" ? cardSub : otherSub).add(clientId);
    if (s.internal) {
      internalOnly.add(clientId);
      return;
    }
    const price = typeof s.priceMonthly === "number" ? s.priceMonthly : 0;
    const discounted = price * (1 - ((s.discountPercent as number | undefined) ?? 0) / 100);
    const entry = (paying[clientId] ??= { labels: [], monthly: 0 });
    entry.labels.push(subscriptionLabel(s));
    entry.monthly += discounted;
  });
  const billingByClient: Record<string, Pick<ClientRow, "billing" | "planLabel" | "priceMonthly">> = {};
  for (const clientId of internalOnly) {
    billingByClient[clientId] = { billing: "internal", planLabel: null, priceMonthly: null };
  }
  for (const [clientId, p] of Object.entries(paying)) {
    billingByClient[clientId] = {
      billing: "paying",
      planLabel: p.labels.length === 1 ? p.labels[0] : `${p.labels.length} ${p.labels.length < 5 ? "služby" : "služeb"}`,
      priceMonthly: Math.round(p.monthly),
    };
  }

  const clients: ClientRow[] = clientsSnap.docs.filter((d) => !!d.data().deletedAt === archived).map((doc) => {
    const data = doc.data();
    const sv = services[doc.id];
    return {
      id: doc.id,
      name: data.name,
      kind: data.kind === "company" ? "company" : "person",
      contactName: data.contactName,
      company: data.company,
      email: data.email,
      status: data.status,
      services: sv ?? { cards: 0, webs: 0, projects: 0, openProjects: 0 },
      hasCard: (sv?.cards ?? 0) > 0 || cardSub.has(doc.id),
      hasOther: (sv?.webs ?? 0) > 0 || (sv?.projects ?? 0) > 0 || otherSub.has(doc.id),
      createdAt: toIso(data.createdAt),
      ownerName: data.salesOwnerUid ? userNames.get(data.salesOwnerUid as string) || null : null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      deletedAt: toIso(data.deletedAt),
      hub: {
        invited: Boolean(data.hubInvitedAt),
        features: (Object.keys(HUB_FEATURES) as HubFeature[]).filter((f) => hubFeaturesFrom(data)[f]),
      },
      ...(billingByClient[doc.id] ?? { billing: "none", planLabel: null, priceMonthly: null }),
    };
  });

  if (archived) clients.sort(byDeletedAtDesc);

  return <ClientsPageClient clients={clients} canArchive={!isSales} archived={archived} />;
}
