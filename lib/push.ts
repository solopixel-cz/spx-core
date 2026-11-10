import webpush from "web-push";
import { getAdminFirestore } from "@/lib/firebase/admin";

/**
 * Odesílání Web Push notifikací (VAPID, bez FCM). Konfiguruje se lazy z env:
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (pár klíčů)
 *   - VAPID_SUBJECT (mailto: kontakt, default hello@solopixel.cz)
 * Když klíče chybí, push se tiše přeskočí (in-app notifikace fungují dál).
 */

let configured: boolean | null = null;

export function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@solopixel.cz";
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Vysoká naléhavost: telefon (Android Doze, iOS) push doručí hned, ne až při
 * probuzení hromadně s ostatními. Platnost 1 den, ať staré zprávy nechodí po týdnu.
 */
const SEND_OPTIONS = { urgency: "high", TTL: 86_400 } as const;

export interface PushPayload {
  title: string;
  body: string;
  href: string;
}

/**
 * Pošle push všem odběrům daných uživatelů. Zaniklé subscriptions (404/410)
 * rovnou promaže. Nikdy nevyhazuje — push je „best effort".
 */
export async function sendPushToUsers(
  uids: string[],
  payload: PushPayload
): Promise<void> {
  if (!ensureConfigured() || uids.length === 0) return;

  const db = getAdminFirestore();
  const payloadStr = JSON.stringify(payload);

  await Promise.all(
    uids.map(async (uid) => {
      const subsSnap = await db
        .collection("users")
        .doc(uid)
        .collection("pushSubscriptions")
        .get();

      await Promise.all(
        subsSnap.docs.map(async (doc) => {
          const sub = doc.data() as {
            endpoint: string;
            keys: { p256dh: string; auth: string };
          };
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys },
              payloadStr,
              SEND_OPTIONS
            );
          } catch (error) {
            const statusCode = (error as { statusCode?: number })?.statusCode;
            // 404/410 = odběr už neexistuje → uklidit.
            if (statusCode === 404 || statusCode === 410) {
              await doc.ref.delete().catch(() => {});
            }
          }
        })
      );
    })
  );
}
