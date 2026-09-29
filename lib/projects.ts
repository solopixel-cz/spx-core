import { Timestamp, FieldValue, type Firestore } from "firebase-admin/firestore";
import type { SessionUser } from "@/lib/auth";

/** Sales smí jen zakázky svých klientů. */
export async function canAccessClient(
  db: Firestore,
  clientId: string,
  user: Pick<SessionUser, "uid" | "role">
) {
  const clientDoc = await db.collection("clients").doc(clientId).get();
  if (!clientDoc.exists) return false;
  if (user.role === "sales" && clientDoc.data()?.salesOwnerUid !== user.uid) return false;
  return true;
}

/**
 * Termín z formuláře (YYYY-MM-DD, prázdné = žádný) + datum dodání:
 * při přechodu do „delivered" se zapíše dnešek, při odchodu z něj se smaže.
 */
export function projectDates(
  dueAt: string | undefined,
  status: string,
  prevStatus: string | null
) {
  const out: Record<string, unknown> = {};
  if (dueAt !== undefined) {
    out.dueAt = dueAt ? Timestamp.fromDate(new Date(`${dueAt}T12:00:00`)) : null;
  }
  if (status === "delivered" && prevStatus !== "delivered") {
    out.deliveredAt = FieldValue.serverTimestamp();
  } else if (status !== "delivered" && prevStatus === "delivered") {
    out.deliveredAt = null;
  }
  return out;
}
