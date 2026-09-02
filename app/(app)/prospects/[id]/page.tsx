import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { ProspectDetailClient } from "@/components/prospects/prospect-detail-client";
import type { ProspectRow } from "@/components/prospects/prospects-page-client";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const db = getAdminFirestore();

  const doc = await db.collection("prospects").doc(id).get();
  if (!doc.exists || doc.data()?.deletedAt) notFound();

  const [usersSnap, emailsSnap, callsSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("outreachEmails").where("prospectId", "==", id).get(),
    db
      .collection("activity")
      .where("entityType", "==", "prospect")
      .where("entityId", "==", id)
      .where("kind", "==", "call")
      .get(),
  ]);

  // Nejvyšší dosažený stav e-mailu (viz seznam)
  const order: Record<string, number> = {
    sent: 0,
    delivered: 1,
    opened: 2,
    clicked: 3,
    bounced: 4,
    complained: 5,
  };
  let lastEmailStatus: string | null = null;
  emailsSnap.docs.forEach((d) => {
    const status = d.data().status as string;
    if (
      lastEmailStatus === null ||
      (order[status] ?? 0) > (order[lastEmailStatus] ?? 0)
    ) {
      lastEmailStatus = status;
    }
  });

  const d = doc.data()!;
  const prospect: ProspectRow = {
    id: doc.id,
    name: d.name as string,
    company: (d.company as string) ?? null,
    email: (d.email as string) ?? null,
    phone: (d.phone as string) ?? null,
    city: (d.city as string) ?? null,
    portalUrl: (d.portalUrl as string) ?? null,
    demoUrl: (d.demoUrl as string) ?? null,
    status: d.status as string,
    ownerUid: (d.ownerUid as string) ?? null,
    leadId: (d.leadId as string) ?? null,
    source: d.source as string,
    importBatchId: (d.importBatchId as string) ?? null,
    claimedAt: serializeTimestamp(d.claimedAt),
    lastTouchAt: serializeTimestamp(d.lastTouchAt),
    nextFollowUpAt: serializeTimestamp(d.nextFollowUpAt),
    lastEmailStatus,
    wasCalled: !!d.wasCalled || callsSnap.size > 0,
    createdAt: serializeTimestamp(d.createdAt),
    updatedAt: serializeTimestamp(d.updatedAt),
    outreachContent: (d.outreachContent as ProspectRow["outreachContent"]) ?? null,
  };

  const users = usersSnap.docs.map((u) => ({
    id: u.id,
    displayName: u.data().displayName as string,
    email: u.data().email as string,
  }));

  return (
    <ProspectDetailClient
      prospect={prospect}
      users={users}
      currentUid={user.uid}
      userRole={user.role}
    />
  );
}
