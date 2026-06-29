import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { renderSubject, sendOutreachEmail } from "@/lib/email";
import { renderFollowupEmail, DEFAULT_FOLLOWUP_SUBJECT } from "@/lib/email-templates/followup";

export async function GET() {
  try {
    await requireAuth();
    const db = getAdminFirestore();
    const doc = await db.collection("templates").doc("followup-email").get();

    if (!doc.exists) {
      return NextResponse.json({ subject: DEFAULT_FOLLOWUP_SUBJECT });
    }

    return NextResponse.json({
      subject: doc.data()?.subject || DEFAULT_FOLLOWUP_SUBJECT,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const { subject } = body as { subject: string };

    if (!subject) {
      return NextResponse.json({ error: "Předmět je povinný" }, { status: 400 });
    }

    const db = getAdminFirestore();
    await db.collection("templates").doc("followup-email").set({ subject });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// POST — send test email to the logged-in user
export async function POST(request: Request) {
  try {
    const user = await requireRole("admin");
    const body = await request.json();
    const { subject } = body as { subject: string };

    if (!subject) {
      return NextResponse.json({ error: "Předmět je povinný" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();
    const senderName = (userData?.senderName as string) || (userData?.displayName as string) || "SoloPixel";
    const senderEmail = (userData?.senderEmail as string) || user.email;

    const testVars = { jmeno: "Jane", odkaz: "https://demo.solopixel.cz" };
    const renderedSubject = renderSubject(subject, testVars);
    const { html, text } = renderFollowupEmail(testVars);

    await sendOutreachEmail({
      to: user.email,
      senderName,
      senderEmail,
      subject: renderedSubject,
      html,
      text,
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
