import { z } from "zod";
import type { Timestamp } from "firebase/firestore";

/**
 * Web Push subscription, jak ji pošle prohlížeč (PushSubscription.toJSON()).
 * Validujeme jen to, co potřebujeme pro odeslání přes `web-push`.
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

/**
 * In-app notifikace v kolekci `notifications/{id}`. Vytváří ji server (admin SDK)
 * přes `notify()`; klient ji jen čte (realtime) a označuje přečtenou (`readAt`).
 */
export interface NotificationDoc {
  id: string;
  recipientUid: string;
  type: string;
  title: string;
  body: string;
  href: string;
  entityType: string | null;
  entityId: string | null;
  readAt: Timestamp | null;
  createdAt: Timestamp | null;
}
