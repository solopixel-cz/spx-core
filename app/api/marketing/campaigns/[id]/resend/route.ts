import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { type CompanyInfo } from "@/lib/marketing/compose";
import { resolveCampaignTargets, sendCampaignEmails } from "@/lib/marketing/send-campaign";

/**
 * Doposlat neodeslaným: stejná šablona na lidi ze seznamu kampaně, kterým
 * e-mail ještě neodešel (bez záznamu, nebo se `status: 'failed'`). Komu už
 * odešel, nedostane ho znovu. Staré záznamy `failed` se nahradí novými.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("admin", "member");
    const { id } = await params;
    const db = getAdminFirestore();

    const campaignRef = db.collection("campaigns").doc(id);
    const campaign = (await campaignRef.get()).data();
    if (!campaign || campaign.deletedAt) return NextResponse.json({ error: "Kampaň nenalezena" }, { status: 404 });
    if (campaign.status === "sending") return NextResponse.json({ error: "Kampaň se právě odesílá" }, { status: 409 });

    const [tplDoc, listDoc, emailsSnap, userDoc, companyDoc] = await Promise.all([
      db.collection("emailTemplates").doc(campaign.templateId).get(),
      db.collection("marketingLists").doc(campaign.listId).get(),
      db.collection("campaignEmails").where("campaignId", "==", id).get(),
      db.collection("users").doc(user.uid).get(),
      db.collection("settings").doc("company").get(),
    ]);
    const tpl = tplDoc.data();
    if (!tpl || tpl.deletedAt) return NextResponse.json({ error: "Šablona kampaně už neexistuje" }, { status: 404 });
    const list = listDoc.data();
    if (!list || list.deletedAt) return NextResponse.json({ error: "Seznam kampaně už neexistuje" }, { status: 404 });

    const delivered = new Set(
      emailsSnap.docs.filter((d) => d.data().status !== "failed").map((d) => String(d.data().toEmail).toLowerCase())
    );
    const { targets: all } = await resolveCampaignTargets(db, list);
    const targets = all.filter((r) => !delivered.has(r.email.toLowerCase()));
    if (targets.length === 0) return NextResponse.json({ error: "Všem ze seznamu už e-mail odešel" }, { status: 400 });

    await campaignRef.update({ status: "sending", updatedAt: FieldValue.serverTimestamp() });

    // Staré neúspěšné pokusy pryč, nové výsledky je nahradí.
    const retried = new Set(targets.map((r) => r.email.toLowerCase()));
    const cleanup = db.batch();
    emailsSnap.docs
      .filter((d) => d.data().status === "failed" && retried.has(String(d.data().toEmail).toLowerCase()))
      .forEach((d) => cleanup.delete(d.ref));
    await cleanup.commit();

    const userData = userDoc.data();
    const { sent, failed } = await sendCampaignEmails({
      db,
      campaignId: id,
      html: (tpl.html as string) ?? "",
      subject: campaign.subject || (tpl.subject as string) || (tpl.name as string) || "Novinka",
      company: (companyDoc.data() ?? {}) as CompanyInfo,
      baseUrl: new URL(request.url).origin,
      sender: {
        senderName: (userData?.senderName as string) || (userData?.displayName as string) || "SoloPixel",
        senderEmail: (userData?.senderEmail as string) || user.email,
        uid: user.uid,
      },
      targets,
    });

    // Čítače z výsledného stavu záznamů.
    const after = await db.collection("campaignEmails").where("campaignId", "==", id).get();
    const failedCount = after.docs.filter((d) => d.data().status === "failed").length;
    const sentCount = after.size - failedCount;
    await campaignRef.update({
      status: sentCount === 0 ? "failed" : "sent",
      totalRecipients: after.size,
      sentCount,
      failedCount,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ sent, failed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
