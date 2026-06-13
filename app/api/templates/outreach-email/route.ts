import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { renderSubject, sendOutreachEmail } from "@/lib/email";
import { renderOutreachEmail, DEFAULT_OUTREACH_SUBJECT } from "@/lib/email-templates/outreach";

export async function GET() {
  try {
    await requireAuth();
    const db = getAdminFirestore();
    const doc = await db.collection("templates").doc("outreach-email").get();

    if (!doc.exists) {
      return NextResponse.json({ subject: DEFAULT_OUTREACH_SUBJECT });
    }

    return NextResponse.json({
      subject: doc.data()?.subject || DEFAULT_OUTREACH_SUBJECT,
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
    await db.collection("templates").doc("outreach-email").set({ subject });

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
    const displayName = (userDoc.data()?.displayName as string) || "Test";

    const testVars = { jmeno: "Jane", odkaz: "https://demo.solopixel.cz" };
    const renderedSubject = renderSubject(subject, testVars);
    const { html, text } = renderOutreachEmail(testVars);

    await sendOutreachEmail({
      to: user.email,
      senderName: displayName,
      senderEmail: user.email,
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
