import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeSubmission } from "@/lib/submission-view-model";
import { sendTransactionalEmail } from "@/lib/email";
import { notify } from "@/lib/notifications";
import { copySubmissionIcoToClient } from "@/lib/submission-ico";

/**
 * Interní upozornění na nový vyplněný podklad.
 *
 * Volá se server-to-server z webu (`spx-web`) po úspěšném odeslání formuláře —
 * viz varianta A ve fázi 30. Chráněno sdíleným tajemstvím: od 1.57.0 stačí `WEB_LEAD_INGEST_SECRET`
 * (stejné jako poptávky, web posílá jedno tajemství na všechno), starší `SUBMISSION_NOTIFY_SECRET` platí dál,
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
    const secrets = [process.env.WEB_LEAD_INGEST_SECRET, process.env.SUBMISSION_NOTIFY_SECRET].filter(Boolean);
    if (secrets.length === 0) {
      return NextResponse.json(
        { error: "WEB_LEAD_INGEST_SECRET is not configured" },
        { status: 500 }
      );
    }
    const given = request.headers.get("x-notify-secret");
    if (!given || !secrets.includes(given)) {
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
    const podkladyUrl = host ? `${proto}://${host}/submissions/${encodeURIComponent(token)}` : "";

    const subject = `Nové podklady: ${name}`;
    const html =
      `<p>Klient <strong>${escapeHtml(name)}</strong> vyplnil formulář podkladů.</p>` +
      (podkladyUrl
        ? `<p><a href="${podkladyUrl}">Otevřít podklady v CRM</a></p>`
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

    // IČO z podkladů ke klientovi (když ho ještě nemá), aby bylo v detailu i na faktuře.
    await copySubmissionIcoToClient(db, token, data).catch(() => false);

    await notify({
      type: "submission.filled",
      title: "Nové podklady",
      body: `${name} vyplnil formulář podkladů`,
      href: `/submissions/${encodeURIComponent(token)}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
