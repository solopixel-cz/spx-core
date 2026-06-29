import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import { logActivity } from "@/lib/activity";
import { renderSubject, sendTransactionalEmail } from "@/lib/email";
import { renderCardFormEmail, DEFAULT_CARDFORM_SUBJECT } from "@/lib/email-templates/cardform";
import { buildCardFormUrl } from "@/lib/card-form-url";

// GET /api/card-tokens?clientId=xxx — get existing tokens for a client
export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "clientId je povinné" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const snapshot = await db
      .collection("card-tokens")
      .where("clientId", "==", clientId)
      .get();

    const tokens = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      usedAt: doc.data().usedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json(tokens);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/card-tokens — generate a new token for a client
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { clientId, name, email } = (await request.json()) as {
      clientId: string;
      name: string;
      email: string;
    };

    if (!clientId || !name || !email) {
      return NextResponse.json(
        { error: "clientId, name a email jsou povinné" },
        { status: 400 }
      );
    }

    const token = nanoid(21);
    const db = getAdminFirestore();

    await db.collection("card-tokens").doc(token).set({
      email,
      name,
      clientId,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Send the invitation e-mail with the form link (best-effort — a failed
    // send must not lose the token; the link can always be copied manually).
    const odkaz = buildCardFormUrl(token);
    let emailSent = false;
    let emailError: string | undefined;

    try {
      const templateDoc = await db.collection("templates").doc("cardform-email").get();
      const subjectTemplate = (templateDoc.data()?.subject as string) || DEFAULT_CARDFORM_SUBJECT;

      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();
      const senderName = (userData?.senderName as string) || (userData?.displayName as string) || "SoloPixel";
      const senderEmail = (userData?.senderEmail as string) || user.email;

      const jmeno = name.split(" ")[0];
      const renderedSubject = renderSubject(subjectTemplate, { jmeno, odkaz });
      const { html, text } = renderCardFormEmail({ jmeno, odkaz });

      const result = await sendTransactionalEmail({
        to: email,
        senderName,
        senderEmail,
        subject: renderedSubject,
        html,
        text,
      });

      await db.collection("cardFormEmails").add({
        clientId,
        token,
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

      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Nepodařilo se odeslat e-mail";
    }

    await logActivity({
      entityType: "client",
      entityId: clientId,
      kind: emailSent ? "email" : "system",
      text: emailSent
        ? `Odeslán formulář podkladů na ${email}`
        : "Vygenerován odkaz na formulář podkladů (e-mail se nepodařilo odeslat)",
      actorUid: user.uid,
    });

    return NextResponse.json({ token, emailSent, emailError });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
