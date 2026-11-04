import webpush from "web-push";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { ensureConfigured } from "@/lib/push";

/**
 * Notifikace do zařízení klienta v SoloPixel HUB (Web Push) u faktur.
 * Zařízení a nastavení spravuje spx-hub (lib/push.ts, stránka Notifikace):
 * - `hubPushSubscriptions`: zařízení klienta (`clientId`, `endpoint`, `keys`),
 * - `hubNotifications/{clientId}.push.invoice`: false = faktury neposílat.
 * Klíče VAPID jsou stejné jako pro týmové notifikace CRM (lib/push.ts) a hub
 * je musí mít také (stejné hodnoty NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT).
 */

const czk = (amount: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount);

async function pushInvoice(clientId: string, payload: { title: string; body: string; tag: string }) {
  if (!ensureConfigured()) return;
  const db = getAdminFirestore();
  const [settings, subs] = await Promise.all([
    db.collection("hubNotifications").doc(clientId).get(),
    db.collection("hubPushSubscriptions").where("clientId", "==", clientId).get(),
  ]);
  if (subs.empty || settings.data()?.push?.invoice === false) return;
  // Cesta v hubu; service worker hubu ji otevře na své doméně.
  const body = JSON.stringify({ ...payload, url: "/billing" });
  await Promise.all(
    subs.docs.map(async (doc) => {
      const { endpoint, keys } = doc.data();
      try {
        await webpush.sendNotification({ endpoint, keys }, body, { TTL: 86_400 });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // Zařízení odběr zrušilo → uklidit (stejně jako hub).
        if (status === 404 || status === 410) await doc.ref.delete().catch(() => undefined);
        else console.error("Hub push failed:", status ?? error);
      }
    })
  );
}

/**
 * Vystavená faktura (ne koncept) → notifikace klientovi. Chyba se jen zaloguje,
 * vystavení faktury nikdy neblokuje.
 */
export async function notifyInvoiceIssued(invoice: { clientId: string; number: string; amount: number; dueAt?: Date | null }) {
  try {
    const due = invoice.dueAt
      ? `, splatnost ${invoice.dueAt.toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" })}`
      : "";
    await pushInvoice(invoice.clientId, {
      title: "Nová faktura k úhradě",
      body: `Faktura ${invoice.number} na ${czk(invoice.amount)}${due}.`,
      tag: `invoice-${invoice.number}`,
    });
  } catch (error) {
    console.error("Invoice issued push failed:", error);
  }
}

/** Faktura uhrazena → poděkování klientovi. */
export async function notifyInvoicePaid(invoice: { clientId: string; number: string; amount: number }) {
  try {
    await pushInvoice(invoice.clientId, {
      title: "Faktura uhrazena",
      body: `Platbu za fakturu ${invoice.number} (${czk(invoice.amount)}) jsme přijali. Děkujeme.`,
      tag: `invoice-${invoice.number}`,
    });
  } catch (error) {
    console.error("Invoice paid push failed:", error);
  }
}
