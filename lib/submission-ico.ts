import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeSubmission } from "@/lib/submission-view-model";

/** IČO z podkladů, jen platné (8 číslic). */
function validIco(value: unknown): string | null {
  const ico = typeof value === "string" ? value.replace(/\s/g, "") : "";
  return /^\d{8}$/.test(ico) ? ico : null;
}

/**
 * IČO z posledních vyplněných podkladů klienta (přes jeho pozvánky `card-tokens`).
 * Pro detail klienta, který vlastní IČO ještě nemá.
 */
export async function submissionIcoForClient(db: Firestore, clientId: string): Promise<string | null> {
  const tokens = await db.collection("card-tokens").where("clientId", "==", clientId).get();
  if (tokens.empty) return null;
  const subs = await db.getAll(...tokens.docs.map((t) => db.collection("card-submissions").doc(t.id)));
  const latest = subs
    .filter((s) => s.exists)
    .map((s) => ({ ico: validIco(normalizeSubmission(s.data()!).ico), at: s.data()!.createdAt?.toMillis?.() ?? 0 }))
    .filter((s) => s.ico)
    .sort((a, b) => b.at - a.at)[0];
  return latest?.ico ?? null;
}

/**
 * Po vyplnění podkladů propíše IČO ke klientovi pozvánky, pokud ho klient ještě nemá
 * (ručně zadané IČO nepřepisuje). Vrací true, když zapsal.
 */
export async function copySubmissionIcoToClient(
  db: Firestore,
  token: string,
  submission: FirebaseFirestore.DocumentData
): Promise<boolean> {
  const ico = validIco(normalizeSubmission(submission).ico);
  if (!ico) return false;
  const clientId = (await db.collection("card-tokens").doc(token).get()).data()?.clientId as string | undefined;
  if (!clientId) return false;
  const clientRef = db.collection("clients").doc(clientId);
  const client = await clientRef.get();
  if (!client.exists || client.data()?.ico) return false;
  await clientRef.update({ ico, updatedAt: FieldValue.serverTimestamp() });
  return true;
}
