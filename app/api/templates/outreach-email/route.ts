import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { renderTemplate, sendOutreachEmail } from "@/lib/email";

export async function GET() {
  try {
    await requireAuth();
    const db = getAdminFirestore();
    const doc = await db.collection("templates").doc("outreach-email").get();

    if (!doc.exists) {
      return NextResponse.json({ subject: "", body: "" });
    }

    return NextResponse.json(doc.data());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const { subject, body: templateBody } = body as {
      subject: string;
      body: string;
    };

    if (!subject || !templateBody) {
      return NextResponse.json(
        { error: "Předmět a tělo jsou povinné" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    await db.collection("templates").doc("outreach-email").set({
      subject,
      body: templateBody,
    });

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
    const { subject, body: templateBody } = body as {
      subject: string;
      body: string;
    };

    if (!subject || !templateBody) {
      return NextResponse.json(
        { error: "Předmět a tělo jsou povinné" },
        { status: 400 }
      );
    }

    // Get user details
    const db = getAdminFirestore();
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();
    const displayName = (userData?.displayName as string) || "Test";

    const rendered = renderTemplate(
      { subject, body: templateBody },
      { jmeno: "Jane", odkaz: "https://demo.solopixel.cz" }
    );

    await sendOutreachEmail({
      to: user.email,
      senderName: displayName,
      senderEmail: user.email,
      subject: rendered.subject,
      html: rendered.html,
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
