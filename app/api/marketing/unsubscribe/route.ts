import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Veřejné odhlášení z marketingu. Token je per-příjemce (uložený na
 * campaignEmails), takže odhlásit lze jen vlastní e-mail z odkazu.
 * Mutace přes POST (ne GET), aby ji nespustil e-mailový skener prefetchem.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token ?? "").trim();
    if (!token) {
      return NextResponse.json({ error: "Chybí token" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const snap = await db
      .collection("campaignEmails")
      .where("unsubToken", "==", token)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: "Neplatný odkaz" }, { status: 404 });
    }

    const d = snap.docs[0].data();
    const email = ((d.toEmail as string) ?? "").trim();
    if (!email) {
      return NextResponse.json({ error: "Neplatný odkaz" }, { status: 404 });
    }

    const docId = email.toLowerCase();
    await db.collection("marketingUnsubscribes").doc(docId).set({
      email,
      campaignId: (d.campaignId as string) ?? null,
      contactType: (d.contactType as string) ?? null,
      contactId: (d.contactId as string) ?? null,
      unsubscribedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ status: "ok", email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
