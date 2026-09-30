import type { Firestore } from "firebase-admin/firestore";
import type { SessionUser } from "@/lib/auth";

/** Aktivní uživatelé a klienti (sales jen vlastní) pro výběry ve formulářích. */
export async function loadUserAndClientOptions(db: Firestore, user: SessionUser) {
  const [usersSnap, clientsSnap] = await Promise.all([
    db.collection("users").where("active", "==", true).get(),
    user.role === "sales"
      ? db.collection("clients").where("salesOwnerUid", "==", user.uid).get()
      : db.collection("clients").get(),
  ]);
  const users = usersSnap.docs.map((d) => ({
    id: d.id,
    displayName: d.data().displayName as string,
  }));
  const clients = clientsSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((d) => ({ id: d.id, name: d.data().name as string }))
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));
  return { users, clients };
}

/** Instance (vizitky / weby) daných klientů pro výběr u ticketu. */
export async function loadInstanceOptions(db: Firestore, clientIds: Set<string>) {
  const snap = await db.collection("instances").get();
  return snap.docs
    .filter((d) => !d.data().deletedAt && clientIds.has(d.data().clientId as string))
    .map((d) => ({
      id: d.id,
      clientId: d.data().clientId as string,
      domain: d.data().domain as string,
    }));
}
