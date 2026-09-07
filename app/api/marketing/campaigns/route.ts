import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { campaignCreateSchema } from "@/lib/schemas/campaign";
import { sendTransactionalEmail } from "@/lib/email";
import { statusOrder } from "@/lib/schemas/email-status";
import { firstName } from "@/lib/marketing/personalize";
import { composeMarketingEmail, type CompanyInfo } from "@/lib/marketing/compose";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

interface Recipient {
  type: "prospect" | "client";
  id: string;
  name: string;
  email: string;
}

// GET — výpis kampaní s agregovanými statistikami
export async function GET() {
  try {
    await requireRole("admin", "member");
    const db = getAdminFirestore();

    const [campSnap, emailSnap] = await Promise.all([
      db.collection("campaigns").orderBy("createdAt", "desc").get(),
      db.collection("campaignEmails").get(),
    ]);

    // Agregace statusů per kampaň
    const stats = new Map<string, { delivered: number; opened: number; clicked: number; bounced: number }>();
    emailSnap.docs.forEach((doc) => {
      const d = doc.data();
      const cid = d.campaignId as string;
      const order = statusOrder[d.status as string] ?? 0;
      const s = stats.get(cid) ?? { delivered: 0, opened: 0, clicked: 0, bounced: 0 };
      if (order >= statusOrder.delivered && order <= statusOrder.clicked) s.delivered++;
      if (order >= statusOrder.opened && order <= statusOrder.clicked) s.opened++;
      if (order >= statusOrder.clicked && order <= statusOrder.clicked) s.clicked++;
      if (d.status === "bounced") s.bounced++;
      stats.set(cid, s);
    });

    const campaigns = campSnap.docs
      .filter((d) => !d.data().deletedAt)
      .map((doc) => {
        const d = doc.data();
        const s = stats.get(doc.id) ?? { delivered: 0, opened: 0, clicked: 0, bounced: 0 };
        return {
          id: doc.id,
          name: d.name as string,
          templateName: (d.templateName as string) ?? null,
          listName: (d.listName as string) ?? null,
          status: d.status as string,
          totalRecipients: (d.totalRecipients as number) ?? 0,
          sentCount: (d.sentCount as number) ?? 0,
          ...s,
          sentAt: serializeTimestamp(d.sentAt),
          createdAt: serializeTimestamp(d.createdAt),
        };
      });

    return NextResponse.json({ campaigns });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — odeslat kampaň (nebo testovací e-mail)
export async function POST(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const body = await request.json();
    const data = campaignCreateSchema.parse(body);

    const db = getAdminFirestore();

    // Šablona
    const tplDoc = await db.collection("emailTemplates").doc(data.templateId).get();
    if (!tplDoc.exists || tplDoc.data()?.deletedAt) {
      return NextResponse.json({ error: "Šablona nenalezena" }, { status: 404 });
    }
    const tpl = tplDoc.data()!;
    const tplHtml = (tpl.html as string) ?? "";
    const tplSubject = (tpl.subject as string) || (tpl.name as string) || "Novinka";
    const tplName = tpl.name as string;

    // Odesílatel
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();
    const senderName = (userData?.senderName as string) || (userData?.displayName as string) || "SoloPixel";
    const senderEmail = (userData?.senderEmail as string) || user.email;

    // Identifikace odesílatele (patička) + báze URL pro odhlašovací odkaz
    const companyDoc = await db.collection("settings").doc("company").get();
    const company = (companyDoc.data() ?? {}) as CompanyInfo;
    const baseUrl = new URL(request.url).origin;

    // Testovací odeslání — bez záznamu, jeden e-mail (s patičkou i plain-textem)
    if (data.testEmail) {
      const jmeno = firstName(data.testEmail.split("@")[0]);
      const composed = composeMarketingEmail({
        html: tplHtml,
        subject: tplSubject,
        vars: { jmeno, email: data.testEmail },
        unsubscribeUrl: `${baseUrl}/unsubscribe/ukazka`,
        company,
      });
      await sendTransactionalEmail({
        to: data.testEmail,
        senderName,
        senderEmail,
        subject: `[TEST] ${composed.subject}`,
        html: composed.html,
        text: composed.text,
      });
      return NextResponse.json({ status: "ok", test: true });
    }

    // Ostrá kampaň — potřebuje seznam
    if (!data.listId) {
      return NextResponse.json({ error: "Vyberte seznam kontaktů" }, { status: 400 });
    }
    const listDoc = await db.collection("marketingLists").doc(data.listId).get();
    if (!listDoc.exists || listDoc.data()?.deletedAt) {
      return NextResponse.json({ error: "Seznam nenalezen" }, { status: 404 });
    }
    const listData = listDoc.data()!;
    const listName = listData.name as string;
    const prospectIds = (listData.prospectIds as string[]) ?? [];
    const clientIds = (listData.clientIds as string[]) ?? [];

    // Rozřešit příjemce
    const refs = [
      ...prospectIds.map((pid) => db.collection("prospects").doc(pid)),
      ...clientIds.map((cid) => db.collection("clients").doc(cid)),
    ];
    const recipients: Recipient[] = [];
    const seenEmails = new Set<string>();
    if (refs.length > 0) {
      const docs = await db.getAll(...refs);
      for (const doc of docs) {
        if (!doc.exists || doc.data()?.deletedAt) continue;
        const d = doc.data()!;
        const email = ((d.email as string) ?? "").trim();
        if (!email) continue;
        const lower = email.toLowerCase();
        if (seenEmails.has(lower)) continue;
        seenEmails.add(lower);
        recipients.push({
          type: doc.ref.parent.id === "prospects" ? "prospect" : "client",
          id: doc.id,
          name: (d.name as string) ?? "",
          email,
        });
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Seznam nemá žádné příjemce s e-mailem" },
        { status: 400 }
      );
    }

    // Vyřadit odhlášené (marketingUnsubscribes, doc id = e-mail malými písmeny)
    const unsubSnap = await db.collection("marketingUnsubscribes").get();
    const unsubscribed = new Set(unsubSnap.docs.map((d) => d.id));
    const skippedUnsubscribed = recipients.filter((r) =>
      unsubscribed.has(r.email.toLowerCase())
    ).length;
    const targets = recipients.filter((r) => !unsubscribed.has(r.email.toLowerCase()));

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "Všichni příjemci ze seznamu jsou odhlášení z odběru" },
        { status: 400 }
      );
    }

    // Založit kampaň (sending)
    const campaignRef = await db.collection("campaigns").add({
      name: data.name?.trim() || `${tplName} → ${listName}`,
      templateId: data.templateId,
      templateName: tplName,
      listId: data.listId,
      listName,
      subject: tplSubject,
      status: "sending",
      totalRecipients: targets.length,
      skippedUnsubscribed,
      sentCount: 0,
      failedCount: 0,
      sentAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    // Odeslat po dávkách (omezená souběžnost)
    let sentCount = 0;
    let failedCount = 0;
    const CHUNK = 15;
    for (let i = 0; i < targets.length; i += CHUNK) {
      const chunk = targets.slice(i, i + CHUNK);
      const results = await Promise.allSettled(
        chunk.map(async (r) => {
          const jmeno = firstName(r.name);
          // Per-příjemce token pro odhlašovací odkaz v patičce
          const unsubToken = crypto.randomUUID();
          const composed = composeMarketingEmail({
            html: tplHtml,
            subject: tplSubject,
            vars: { jmeno, email: r.email },
            unsubscribeUrl: `${baseUrl}/unsubscribe/${unsubToken}`,
            company,
          });
          const result = await sendTransactionalEmail({
            to: r.email,
            senderName,
            senderEmail,
            subject: composed.subject,
            html: composed.html,
            text: composed.text,
          });
          await db.collection("campaignEmails").add({
            campaignId: campaignRef.id,
            toEmail: r.email,
            contactType: r.type,
            contactId: r.id,
            senderUid: user.uid,
            resendId: result?.id || "",
            unsubToken,
            subject: composed.subject,
            status: "sent",
            sentAt: FieldValue.serverTimestamp(),
            lastEventAt: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        })
      );
      results.forEach((res) => (res.status === "fulfilled" ? sentCount++ : failedCount++));
    }

    await campaignRef.update({
      status: failedCount === targets.length ? "failed" : "sent",
      sentCount,
      failedCount,
      sentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      id: campaignRef.id,
      sent: sentCount,
      failed: failedCount,
      total: targets.length,
      skippedUnsubscribed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
