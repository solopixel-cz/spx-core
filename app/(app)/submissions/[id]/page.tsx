import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getSalesClientIds } from "@/lib/sales-clients";
import { normalizeSubmission } from "@/lib/submission-view-model";
import { toIso } from "@/lib/archive-view";
import { SubmissionDetailClient } from "@/components/submissions/submission-detail-client";

export default async function PodkladDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const db = getAdminFirestore();

  // Dokument ID = token pozvánky
  const [doc, tokenDoc] = await Promise.all([
    db.collection("card-submissions").doc(id).get(),
    db.collection("card-tokens").doc(id).get(),
  ]);
  if (!doc.exists) notFound();

  const data = doc.data()!;
  const view = normalizeSubmission(data);

  // Vazba na klienta: přes token, jinak podle e-mailu (stejně jako seznam).
  let clientId = tokenDoc.data()?.clientId as string | undefined;
  if (!clientId && view.email) {
    const match = await db
      .collection("clients")
      .where("email", "==", view.email)
      .limit(1)
      .get();
    clientId = match.docs[0]?.id;
  }

  const ownedClientIds = await getSalesClientIds(user.uid, user.role);
  if (ownedClientIds && (!clientId || !ownedClientIds.has(clientId))) notFound();

  const [clientDoc, processedByDoc] = await Promise.all([
    clientId ? db.collection("clients").doc(clientId).get() : null,
    data.processedBy ? db.collection("users").doc(data.processedBy as string).get() : null,
  ]);

  return (
    <SubmissionDetailClient
      submission={{
        ...view,
        id: doc.id,
        clientId: clientDoc?.exists ? clientDoc.id : undefined,
        clientName: clientDoc?.exists ? (clientDoc.data()?.name as string) : undefined,
        createdAt: toIso(data.createdAt),
        processedAt: toIso(data.processedAt),
        processedByName: processedByDoc?.exists
          ? (processedByDoc.data()?.displayName as string)
          : undefined,
      }}
    />
  );
}
