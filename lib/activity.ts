import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

interface LogActivityParams {
  entityType: "client" | "lead" | "ticket" | "invoice" | "prospect";
  entityId: string;
  kind: "note" | "status_change" | "call" | "email" | "system";
  text: string;
  actorUid: string;
}

export async function logActivity(params: LogActivityParams) {
  const db = getAdminFirestore();
  await db.collection("activity").add({
    ...params,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: params.actorUid,
  });
}
