import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/auth";
import { PLANS } from "@/lib/plans";
import { archivedQuery, byDeletedAtDesc, isArchiveView, toIso, type ArchiveSearchParams } from "@/lib/archive-view";
import { ClientsPageClient, type ClientRow } from "@/components/clients/clients-page-client";

export default async function KlientiPage({ searchParams }: { searchParams: ArchiveSearchParams }) {
  const user = await requireAuth();
  const db = getAdminFirestore();
  const isSales = user.role === "sales";
  const archived = await isArchiveView(searchParams, user.role);

  const [clientsSnap, instancesSnap, subsSnap] = await Promise.all([
    archived
      ? archivedQuery(db, "clients").get()
      : isSales
      ? db.collection("clients").where("salesOwnerUid", "==", user.uid).orderBy("createdAt", "desc").get()
      : db.collection("clients").orderBy("createdAt", "desc").get(),
    db.collection("instances").get(),
    db.collection("subscriptions").get(),
  ]);

  // Count instances per client
  const instanceCounts: Record<string, number> = {};
  instancesSnap.docs.forEach((doc) => {
    const clientId = doc.data().clientId;
    instanceCounts[clientId] = (instanceCounts[clientId] || 0) + 1;
  });

  // Předplatné (1:1 ke klientovi) — platící = nezrušené a ne interní.
  const billingByClient: Record<string, Pick<ClientRow, "billing" | "planLabel" | "priceMonthly">> = {};
  subsSnap.docs.forEach((doc) => {
    const s = doc.data();
    if (s.status === "cancelled") return;
    const clientId = s.clientId as string;
    if (billingByClient[clientId]?.billing === "paying") return;
    billingByClient[clientId] = s.internal
      ? { billing: "internal", planLabel: null, priceMonthly: null }
      : {
          billing: "paying",
          planLabel: PLANS[s.plan as keyof typeof PLANS]?.label ?? (s.plan as string) ?? null,
          priceMonthly: typeof s.priceMonthly === "number" ? s.priceMonthly : null,
        };
  });

  const clients: ClientRow[] = clientsSnap.docs.filter((d) => !!d.data().deletedAt === archived).map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      company: data.company,
      email: data.email,
      status: data.status,
      instanceCount: instanceCounts[doc.id] || 0,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      deletedAt: toIso(data.deletedAt),
      ...(billingByClient[doc.id] ?? { billing: "none", planLabel: null, priceMonthly: null }),
    };
  });

  if (archived) clients.sort(byDeletedAtDesc);

  return <ClientsPageClient clients={clients} canArchive={!isSales} archived={archived} />;
}
