import type { DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import type { DomainData } from "@/components/clients/domains-tab";

/** Firestore dokument domény → serializovatelná data pro klientské komponenty. */
export function domainFromDoc(doc: DocumentSnapshot): DomainData {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    clientId: (d.clientId as string | null | undefined) ?? null,
    name: d.name as string,
    registrar: (d.registrar as string | undefined) ?? null,
    account: (d.account as string | undefined) ?? null,
    hosting: (d.hosting as string | undefined) ?? null,
    purchasedAt: d.purchasedAt?.toDate?.()?.toISOString() ?? null,
    renewalAt: d.renewalAt?.toDate?.()?.toISOString() ?? null,
    autoRenew: (d.autoRenew as boolean | undefined) ?? false,
    note: (d.note as string | undefined) ?? null,
  };
}

export interface ClientOption {
  id: string;
  name: string;
}

/** Neaktivní (archivovaní) klienti do výběru nepatří, řazeno podle jména. */
export async function clientOptions(db: Firestore): Promise<ClientOption[]> {
  const snap = await db.collection("clients").get();
  return snap.docs
    .filter((doc) => !doc.data().deletedAt)
    .map((doc) => ({ id: doc.id, name: (doc.data().name as string) ?? "—" }))
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));
}
