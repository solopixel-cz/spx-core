import { getAdminFirestore } from "@/lib/firebase/admin";

/**
 * Get the set of client IDs owned by a sales user.
 * Returns null for admin/member (= access all).
 */
export async function getSalesClientIds(uid: string, role: string): Promise<Set<string> | null> {
  if (role !== "sales") return null;
  const db = getAdminFirestore();
  const snap = await db.collection("clients").where("salesOwnerUid", "==", uid).get();
  return new Set(snap.docs.filter((d) => !d.data().deletedAt).map((d) => d.id));
}
