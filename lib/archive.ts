import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activity";

type ArchivableEntity = "client" | "lead" | "ticket";

export async function archiveDocument(
  collection: string,
  id: string,
  actorUid: string,
  entityType: ArchivableEntity,
  reason?: string
) {
  const db = getAdminFirestore();
  const docRef = db.collection(collection).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error("Záznam nenalezen");
  if (doc.data()?.deletedAt) throw new Error("Záznam je již archivován");

  await docRef.update({
    deletedAt: FieldValue.serverTimestamp(),
    deletedBy: actorUid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logActivity({
    entityType,
    entityId: id,
    kind: "system",
    text: `Archivováno${reason ? `: ${reason}` : ""}`,
    actorUid,
  });
}

export async function restoreDocument(
  collection: string,
  id: string,
  actorUid: string,
  entityType: ArchivableEntity
) {
  const db = getAdminFirestore();
  const docRef = db.collection(collection).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error("Záznam nenalezen");
  if (!doc.data()?.deletedAt) throw new Error("Záznam není archivován");

  await docRef.update({
    deletedAt: FieldValue.delete(),
    deletedBy: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logActivity({
    entityType,
    entityId: id,
    kind: "system",
    text: "Obnoveno z archivu",
    actorUid,
  });
}

/**
 * Cascade archive for a client: archive instances, cancel subscription, archive open tickets.
 * Returns a summary of what was archived.
 */
export async function cascadeArchiveClient(clientId: string, actorUid: string) {
  const db = getAdminFirestore();
  const cascaded: string[] = [];

  // Archive active instances
  const instancesSnap = await db.collection("instances")
    .where("clientId", "==", clientId)
    .get();
  for (const doc of instancesSnap.docs) {
    if (doc.data().deletedAt) continue;
    await doc.ref.update({
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: actorUid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    cascaded.push(`Instance ${doc.data().domain}`);
  }

  // Cancel active subscription
  const subsSnap = await db.collection("subscriptions")
    .where("clientId", "==", clientId)
    .get();
  for (const doc of subsSnap.docs) {
    const status = doc.data().status as string;
    if (status !== "cancelled") {
      await doc.ref.update({
        status: "cancelled",
        updatedAt: FieldValue.serverTimestamp(),
      });
      cascaded.push("Předplatné zrušeno");
    }
  }

  // Archive open tickets
  const ticketsSnap = await db.collection("tickets")
    .where("clientId", "==", clientId)
    .get();
  for (const doc of ticketsSnap.docs) {
    if (doc.data().deletedAt) continue;
    const status = doc.data().status as string;
    if (["open", "in_progress", "waiting_client"].includes(status)) {
      await doc.ref.update({
        deletedAt: FieldValue.serverTimestamp(),
        deletedBy: actorUid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      cascaded.push(`Ticket „${doc.data().title}"`);
    }
  }

  return cascaded;
}

/**
 * Check if a document can be permanently deleted (no linked records).
 * Returns null if deletable, or an error message.
 */
export async function checkDeleteConstraints(
  collection: string,
  id: string
): Promise<string | null> {
  const db = getAdminFirestore();

  if (collection === "clients") {
    const checks = await Promise.all([
      db.collection("invoices").where("clientId", "==", id).limit(1).get(),
      db.collection("commissions").where("clientId", "==", id).limit(1).get(),
      db.collection("instances").where("clientId", "==", id).limit(1).get(),
      db.collection("tickets").where("clientId", "==", id).limit(1).get(),
      db.collection("card-tokens").where("clientId", "==", id).limit(1).get(),
      db.collection("subscriptions").where("clientId", "==", id).limit(1).get(),
    ]);
    const labels = ["faktury", "provize", "instance", "tickety", "tokeny podkladů", "předplatné"];
    const found = labels.filter((_, i) => !checks[i].empty);
    if (found.length > 0) return `Nelze trvale smazat — má navázané ${found.join(", ")}. Ponechejte v archivu.`;
  }

  if (collection === "instances") {
    const tickets = await db.collection("tickets").where("instanceId", "==", id).limit(1).get();
    if (!tickets.empty) return "Nelze trvale smazat — má navázané tickety.";
  }

  if (collection === "leads") {
    const clients = await db.collection("clients").where("leadId", "==", id).limit(1).get();
    if (!clients.empty) return "Nelze trvale smazat — byl konvertován na klienta.";
  }

  if (collection === "tickets") {
    const tasks = await db.collection("tasks").where("ticketId", "==", id).limit(1).get();
    if (!tasks.empty) return "Nelze trvale smazat — má navázané úkoly.";
  }

  return null;
}

/**
 * Permanently delete a document and its activity records.
 */
export async function permanentlyDelete(collection: string, id: string) {
  const db = getAdminFirestore();

  // Map collection to entityType for activity
  const entityTypeMap: Record<string, string> = {
    clients: "client",
    instances: "instance",
    leads: "lead",
    tickets: "ticket",
  };
  const entityType = entityTypeMap[collection];

  // Delete activity records
  if (entityType) {
    const activitySnap = await db.collection("activity")
      .where("entityType", "==", entityType)
      .where("entityId", "==", id)
      .get();
    for (const doc of activitySnap.docs) {
      await doc.ref.delete();
    }
  }

  // Delete the document
  await db.collection(collection).doc(id).delete();
}
