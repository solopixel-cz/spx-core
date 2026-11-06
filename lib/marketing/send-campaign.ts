import { FieldValue } from "firebase-admin/firestore";
import { sendBatchEmails } from "@/lib/email";
import { greetingName, vocativeFirstName } from "@/lib/marketing/personalize";
import { composeMarketingEmail, type CompanyInfo } from "@/lib/marketing/compose";

/**
 * Rozeslání kampaně (`campaigns` + `campaignEmails`): příjemci ze seznamu,
 * složení e-mailů a odeslání přes Resend batch API. Používá ho nová kampaň
 * (`POST /api/marketing/campaigns`) i „Doposlat neodeslaným“
 * (`POST /api/marketing/campaigns/[id]/resend`).
 */

type Db = FirebaseFirestore.Firestore;

export interface CampaignRecipient {
  type: "prospect" | "client";
  id: string;
  name: string;
  email: string;
  /** Oslovení ({{jmeno}}) — u firmy kontaktní osoba. */
  greeting: string;
}

/**
 * Příjemci seznamu s e-mailem, bez duplicit (podle e-mailu) a bez odhlášených
 * (`marketingUnsubscribes`, doc id = e-mail malými písmeny).
 */
export async function resolveCampaignTargets(
  db: Db,
  list: { prospectIds?: string[]; clientIds?: string[] }
): Promise<{ recipients: CampaignRecipient[]; targets: CampaignRecipient[]; skippedUnsubscribed: number }> {
  const refs = [
    ...(list.prospectIds ?? []).map((pid) => db.collection("prospects").doc(pid)),
    ...(list.clientIds ?? []).map((cid) => db.collection("clients").doc(cid)),
  ];
  const recipients: CampaignRecipient[] = [];
  const seen = new Set<string>();
  if (refs.length > 0) {
    for (const doc of await db.getAll(...refs)) {
      if (!doc.exists || doc.data()?.deletedAt) continue;
      const d = doc.data()!;
      const email = ((d.email as string) ?? "").trim();
      if (!email || seen.has(email.toLowerCase())) continue;
      seen.add(email.toLowerCase());
      const prospect = doc.ref.parent.id === "prospects";
      recipients.push({
        type: prospect ? "prospect" : "client",
        id: doc.id,
        name: (d.name as string) ?? "",
        email,
        greeting: prospect ? vocativeFirstName((d.name as string) ?? "") : greetingName(d),
      });
    }
  }

  const unsubscribed = new Set((await db.collection("marketingUnsubscribes").get()).docs.map((d) => d.id));
  const targets = recipients.filter((r) => !unsubscribed.has(r.email.toLowerCase()));
  return { recipients, targets, skippedUnsubscribed: recipients.length - targets.length };
}

/**
 * Odešle e-maily a ke každému příjemci založí `campaignEmails`: odeslaný
 * se `status: 'sent'` a `resendId`, neodeslaný se `status: 'failed'`
 * a důvodem (`error`), aby byl vidět v detailu kampaně a šel doposlat.
 */
export async function sendCampaignEmails(params: {
  db: Db;
  campaignId: string;
  html: string;
  subject: string;
  company: CompanyInfo;
  baseUrl: string;
  sender: { senderName: string; senderEmail: string; uid: string };
  targets: CampaignRecipient[];
}): Promise<{ sent: number; failed: number }> {
  const { db, campaignId, sender, targets } = params;
  const prepared = targets.map((r) => {
    // Per-příjemce token pro odhlašovací odkaz v patičce
    const unsubToken = crypto.randomUUID();
    const composed = composeMarketingEmail({
      html: params.html,
      subject: params.subject,
      vars: { jmeno: r.greeting, email: r.email },
      unsubscribeUrl: `${params.baseUrl}/unsubscribe/${unsubToken}`,
      company: params.company,
    });
    return { r, unsubToken, composed };
  });

  const results = await sendBatchEmails(
    sender,
    prepared.map(({ r, composed }) => ({ to: r.email, subject: composed.subject, html: composed.html, text: composed.text }))
  );

  let sent = 0;
  // Firestore batch má limit 500 zápisů.
  for (let i = 0; i < prepared.length; i += 400) {
    const batch = db.batch();
    prepared.slice(i, i + 400).forEach(({ r, unsubToken, composed }, j) => {
      const result = results[i + j];
      if (result.ok) sent++;
      batch.set(db.collection("campaignEmails").doc(), {
        campaignId,
        toEmail: r.email,
        contactType: r.type,
        contactId: r.id,
        senderUid: sender.uid,
        resendId: result.ok ? result.id : "",
        unsubToken,
        subject: composed.subject,
        status: result.ok ? "sent" : "failed",
        ...(result.ok ? {} : { error: result.error.slice(0, 300) }),
        sentAt: FieldValue.serverTimestamp(),
        lastEventAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }
  return { sent, failed: prepared.length - sent };
}
