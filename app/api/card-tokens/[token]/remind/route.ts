import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activity";
import { renderSubject, sendTransactionalEmail } from "@/lib/email";
import {
  renderCardFormReminderEmail,
  DEFAULT_CARDFORM_REMINDER_SUBJECT,
} from "@/lib/email-templates/cardform-reminder";
import { buildCardFormUrl } from "@/lib/card-form-url";

// POST /api/card-tokens/[token]/remind — připomenutí s tím samým (nevyplněným) odkazem
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await requireAuth();
    const { token } = await params;
    const db = getAdminFirestore();

    const tokenDoc = await db.collection("card-tokens").doc(token).get();
    const tokenData = tokenDoc.data();
    if (!tokenDoc.exists || !tokenData) {
      return NextResponse.json({ error: "Odkaz neexistuje" }, { status: 404 });
    }
    if (tokenData.usedAt) {
      return NextResponse.json({ error: "Klient už formulář vyplnil" }, { status: 400 });
    }

    const email = tokenData.email as string;
    const name = tokenData.name as string;
    const clientId = tokenData.clientId as string | undefined;
    const odkaz = buildCardFormUrl(token);

    const templateDoc = await db.collection("templates").doc("cardform-reminder-email").get();
    const subjectTemplate =
      (templateDoc.data()?.subject as string) || DEFAULT_CARDFORM_REMINDER_SUBJECT;

    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();
    const senderName = (userData?.senderName as string) || (userData?.displayName as string) || "SoloPixel";
    const senderEmail = (userData?.senderEmail as string) || user.email;

    const jmeno = name.split(" ")[0];
    const renderedSubject = renderSubject(subjectTemplate, { jmeno, odkaz });
    const { html, text } = renderCardFormReminderEmail({ jmeno, odkaz });

    const result = await sendTransactionalEmail({
      to: email,
      senderName,
      senderEmail,
      subject: renderedSubject,
      html,
      text,
    });

    await db.collection("cardFormEmails").add({
      clientId: clientId ?? null,
      token,
      kind: "reminder",
      toEmail: email,
      senderUid: user.uid,
      resendId: result?.id || "",
      subject: renderedSubject,
      status: "sent",
      sentAt: FieldValue.serverTimestamp(),
      lastEventAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    if (clientId) {
      await logActivity({
        entityType: "client",
        entityId: clientId,
        kind: "email",
        text: `Odesláno připomenutí podkladů na ${email}`,
        actorUid: user.uid,
      });
    }

    return NextResponse.json({ status: "ok", email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepodařilo se odeslat připomenutí";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
