import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendPushToUsers } from "@/lib/push";
import { wantsNotification } from "@/lib/notification-prefs";

/**
 * Interní notifikace týmu: in-app záznam do `notifications/{id}` pro každého
 * příjemce a zároveň Web Push na jeho zařízení. Kdo co dostává, si každý
 * nastaví v profilu (Notifikace). Volá se ze serverových event bodů
 * (poptávka z webu, vyplněné podklady, otevřený e-mail s formulářem…).
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

/**
 * Notifikace týmu: aktivním adminům a memberům, kteří mají daný druh zapnutý
 * v profilu (`users.notificationPrefs`, chybí = zapnuto).
 */
export async function notify(params: NotifyParams): Promise<void> {
  try {
    const db = getAdminFirestore();
    const teamSnap = await db
      .collection("users")
      .where("role", "in", ["admin", "member"])
      .get();
    const uids = teamSnap.docs
      .filter((doc) => doc.data().active !== false && wantsNotification(doc.data().notificationPrefs, params.type))
      .map((doc) => doc.id);
    await notifyUsers(uids, params);
  } catch (error) {
    console.error("[notify] failed", error);
  }
}
