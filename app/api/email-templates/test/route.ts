import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { sendTransactionalEmail } from "@/lib/email";
import { SAMPLE_VARS } from "@/lib/marketing/personalize";
import { composeMarketingEmail, type CompanyInfo } from "@/lib/marketing/compose";

/**
 * Testovací odeslání šablony — pošle aktuální obsah z editoru (i neuložený)
 * na zadanou adresu, personalizovaný ukázkovými daty, s patičkou i plain-textem
 * (jako ostrá kampaň). Bez záznamu.
 */
export async function POST(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const body = await request.json();
    const toEmail = String(body.testEmail ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const html = String(body.html ?? "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return NextResponse.json({ error: "Zadejte platnou e-mailovou adresu" }, { status: 400 });
    }
    if (!html.trim()) {
      return NextResponse.json({ error: "Šablona nemá žádné HTML" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();
    const senderName = (userData?.senderName as string) || (userData?.displayName as string) || "SoloPixel";
    const senderEmail = (userData?.senderEmail as string) || user.email;

    const companyDoc = await db.collection("settings").doc("company").get();
    const company = (companyDoc.data() ?? {}) as CompanyInfo;
    const baseUrl = new URL(request.url).origin;

    const composed = composeMarketingEmail({
      html,
      subject: subject || "Náhled šablony",
      vars: SAMPLE_VARS,
      unsubscribeUrl: `${baseUrl}/unsubscribe/ukazka`,
      company,
    });

    await sendTransactionalEmail({
      to: toEmail,
      senderName,
      senderEmail,
      subject: `[TEST] ${composed.subject}`,
      html: composed.html,
      text: composed.text,
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
