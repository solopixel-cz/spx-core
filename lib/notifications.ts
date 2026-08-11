import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendPushToUsers } from "@/lib/push";

/**
 * Interní notifikace. Aktuálně míří všem adminům (malý tým, centrální dohled) —
 * zapíše in-app záznam do `notifications/{id}` pro každého admina a zároveň
 * pošle Web Push na jejich zařízení. Volá se ze serverových event bodů
 * (intake leadu, vyplněné podklady, otevřený e-mail s formulářem…).
 *
 * Notifikace nikdy neshodí hlavní operaci — chyby jen zaloguje.
 */

export interface NotifyParams {
  /** Strojový typ události, např. "lead.web" | "submission.filled". */
  type: string;
  title: string;
  body: string;
  /** Kam navigovat po kliknutí (in-app i push). */
  href: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Doručí notifikaci konkrétním uživatelům (in-app záznam + Web Push).
 * Nikdy neshodí hlavní operaci — chyby jen zaloguje.
 */
export async function notifyUsers(
  uids: string[],
  params: NotifyParams
): Promise<void> {
  try {
    const recipients = [...new Set(uids)].filter(Boolean);
    if (recipients.length === 0) return;

    const db = getAdminFirestore();
    const batch = db.batch();
    for (const uid of recipients) {
      const ref = db.collection("notifications").doc();
      batch.set(ref, {
        recipientUid: uid,
        type: params.type,
        title: params.title,
        body: params.body,
        href: params.href,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        readAt: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    await sendPushToUsers(recipients, {
      title: params.title,
      body: params.body,
      href: params.href,
    });
  } catch (error) {
    console.error("[notifyUsers] failed", error);
  }
}

/** Notifikace všem aktivním adminům (centrální dohled). */
export async function notify(params: NotifyParams): Promise<void> {
  try {
    const db = getAdminFirestore();
    const adminsSnap = await db
      .collection("users")
      .where("role", "==", "admin")
      .get();
    const adminUids = adminsSnap.docs
      .filter((doc) => doc.data().active !== false)
      .map((doc) => doc.id);
    await notifyUsers(adminUids, params);
  } catch (error) {
    console.error("[notify] failed", error);
  }
}
