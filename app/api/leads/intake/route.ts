import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { webInquirySchema } from "@/lib/schemas/web-inquiry";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";

/**
 * Veřejný příjem poptávek z marketingového webu (spx-web, /kontakt).
 *
 * Leady jsou zrušené (2026-09-30) → poptávka vznikne jako kontakt v **Oslovení**
 * (`prospects`, zdroj „web", stav „new"); celý obsah poptávky jde do aktivity
 * kontaktu. Cesta `/api/leads/intake` zůstává kvůli webové proxy
 * (`spx-web/pages/api/lead.ts`, env `LEAD_INGEST_URL`).
 *
 * Volá se server-to-server, chráněno sdíleným tajemstvím (`x-ingest-secret` /
 * env `WEB_LEAD_INGEST_SECRET`). Vlastník z env `LEADS_DEFAULT_OWNER_UID`,
 * nikdy z payloadu.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.WEB_LEAD_INGEST_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "WEB_LEAD_INGEST_SECRET is not configured" },
        { status: 500 }
      );
    }
    if (request.headers.get("x-ingest-secret") !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerUid = process.env.LEADS_DEFAULT_OWNER_UID;
    if (!ownerUid) {
      return NextResponse.json(
        { error: "LEADS_DEFAULT_OWNER_UID is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const data = webInquirySchema.parse(body);

    // Odpovědi z formuláře poskládáme do čitelného záznamu v aktivitě kontaktu.
    const lines: string[] = [];
    if (data.industry) lines.push(`Obor: ${data.industry}`);
    if (data.product) lines.push(`Produkt: ${data.product}`);
    if (data.plan) lines.push(`Plán: ${data.plan}`);
    if (data.teamType) lines.push(`Režim: ${data.teamType === "team" ? "tým" : "sólo"}`);
    if (data.teamSize) lines.push(`Velikost týmu: ${data.teamSize}`);
    if (data.link) lines.push(`Odkaz: ${data.link}`);
    if (data.message) lines.push(`Zpráva: ${data.message}`);
    // `note` z proxy už obsahuje i řádek „Zdroj: utm_…"; samostatná utm pole jen když chybí.
    if (data.note) lines.push(`Poznámka: ${data.note}`);
    else {
      const utm = [data.utm_source, data.utm_medium, data.utm_campaign].filter(Boolean);
      if (utm.length) lines.push(`Zdroj: ${utm.join(" / ")}`);
    }

    const db = getAdminFirestore();
    const docRef = await db.collection("prospects").add({
      name: data.name,
      company: null,
      email: data.email || null,
      phone: data.phone || null,
      city: null,
      category: data.industry || null,
      portalUrl: data.link || null,
      demoUrl: null,
      status: "new",
      source: "web",
      ownerUid,
      claimedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: "web-intake",
    });

    await logActivity({
      entityType: "prospect",
      entityId: docRef.id,
      kind: "system",
      text: `Poptávka z webu${lines.length ? `\n${lines.join("\n")}` : ""}`,
      actorUid: ownerUid,
    });

    // Typ „lead.web" zůstává kvůli uloženým preferencím notifikací.
    await notify({
      type: "lead.web",
      title: "Nová poptávka z webu",
      body: data.email ? `${data.name} · ${data.email}` : data.name,
      href: `/prospects/${docRef.id}`,
      entityType: "prospect",
      entityId: docRef.id,
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
