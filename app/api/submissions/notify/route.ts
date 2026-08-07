import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeSubmission } from "@/lib/submission-view-model";
import { sendTransactionalEmail } from "@/lib/email";

/**
 * Interní upozornění na nový vyplněný podklad.
 *
 * Volá se server-to-server z webu (`spx-web`) po úspěšném odeslání formuláře —
 * viz varianta A ve fázi 30. Chráněno sdíleným tajemstvím (`SUBMISSION_NOTIFY_SECRET`),
 * idempotentní přes `notifiedAt` (jeden podklad = jeden e-mail).
 */

const NOTIFY_TO = "hello@solopixel.cz";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!
  );
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.SUBMISSION_NOTIFY_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "SUBMISSION_NOTIFY_SECRET is not configured" },
        { status: 500 }
      );
    }
    if (request.headers.get("x-notify-secret") !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const token = body?.token;
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const ref = db.collection("card-submissions").doc(token);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const data = snap.data()!;
    if (data.notifiedAt) {
      // Už jsme upozornili — nic dalšího neposílej (idempotence).
      return NextResponse.json({ ok: true, skipped: "already-notified" });
    }

    const name = normalizeSubmission(data).fullName?.trim() || "Neznámý klient";

    // Odkaz do CRM odvodíme z hostu příchozího requestu (bez další env proměnné).
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    const podkladyUrl = host ? `${proto}://${host}/podklady` : "";

    const subject = `Nové podklady: ${name}`;
    const html =
      `<p>Klient <strong>${escapeHtml(name)}</strong> vyplnil formulář podkladů.</p>` +
      (podkladyUrl
        ? `<p><a href="${podkladyUrl}">Otevřít v CRM → Podklady</a></p>`
        : "");
    const text =
      `Klient ${name} vyplnil formulář podkladů.` +
      (podkladyUrl ? `\n\n${podkladyUrl}` : "");

    await sendTransactionalEmail({
      to: NOTIFY_TO,
      senderName: "SoloPixel",
      senderEmail: NOTIFY_TO,
      subject,
      html,
      text,
    });

    await ref.update({ notifiedAt: FieldValue.serverTimestamp() });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
