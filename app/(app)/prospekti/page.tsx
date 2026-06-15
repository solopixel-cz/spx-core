import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { ProspektiPageClient } from "@/components/prospects/prospects-page-client";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export default async function ProspektiPage() {
  const user = await requireAuth();
  const db = getAdminFirestore();

  const pageLimit = 50;
  const [prospectsSnap, usersSnap, emailsSnap, callsSnap] = await Promise.all([
    db.collection("prospects")
      .orderBy("createdAt", "desc")
      .limit(pageLimit * 2)
      .get(),
    db.collection("users").get(),
    db.collection("outreachEmails").get(),
    db.collection("activity")
      .where("entityType", "==", "prospect")
      .where("kind", "==", "call")
      .get(),
  ]);

  // Build map: prospectId -> latest email status
  const emailStatusMap = new Map<string, string>();
  emailsSnap.docs.forEach((doc) => {
    const d = doc.data();
    const pid = d.prospectId as string;
    const status = d.status as string;
    const existing = emailStatusMap.get(pid);
    // Keep the "highest" status
    const order: Record<string, number> = { sent: 0, delivered: 1, opened: 2, clicked: 3, bounced: 4, complained: 5 };
    if (!existing || (order[status] ?? 0) > (order[existing] ?? 0)) {
      emailStatusMap.set(pid, status);
    }
  });

  // Build set: prospect IDs that have been called
  const calledProspectIds = new Set<string>();
  callsSnap.docs.forEach((doc) => {
    calledProspectIds.add(doc.data().entityId as string);
  });

  const nonDeletedDocs = prospectsSnap.docs.filter((d) => !d.data().deletedAt);
  const prospectDocs = nonDeletedDocs.slice(0, pageLimit);
  const initialHasMore = nonDeletedDocs.length > pageLimit;

  const prospects = prospectDocs.map((doc) => {
    const d = doc.data();
    return {
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
      lastEmailStatus: emailStatusMap.get(doc.id) ?? null,
      wasCalled: !!d.wasCalled || calledProspectIds.has(doc.id),
      createdAt: serializeTimestamp(d.createdAt),
      updatedAt: serializeTimestamp(d.updatedAt),
    };
  });

  const users = usersSnap.docs.map((doc) => ({
    id: doc.id,
    displayName: doc.data().displayName as string,
    email: doc.data().email as string,
  }));

  return (
    <ProspektiPageClient
      initialProspects={prospects}
      initialHasMore={initialHasMore}
      users={users}
      currentUid={user.uid}
      userRole={user.role}
    />
  );
}
