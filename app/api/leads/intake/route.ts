import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { stripSourceLine, webInquirySchema } from "@/lib/schemas/web-inquiry";
import { attributionSummary } from "@/lib/attribution";
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

    // Obsah poptávky a zdroj návštěvy strukturovaně (filtrování, počty podle kampaně).
    // Chybějící hodnoty = null. Řádek „Zdroj: …" z poznámky se nahrazuje `attribution`.
    const inquiry = {
      industry: data.industry ?? null,
      product: data.product ?? null,
      plan: data.plan ?? null,
      teamType: data.teamType ?? null,
      teamSize: data.teamSize != null && data.teamSize !== "" ? String(data.teamSize) : null,
      link: data.link ?? null,
      message: data.message ?? null,
      note: stripSourceLine(data.note) ?? null,
    };
    const attribution = {
      utmSource: data.utm_source ?? null,
      utmMedium: data.utm_medium ?? null,
      utmCampaign: data.utm_campaign ?? null,
      utmContent: data.utm_content ?? null,
      referrer: data.referrer ?? null,
      landingPage: data.landing_page ?? null,
    };
    const source = attributionSummary(attribution);

    // Čitelný záznam do aktivity kontaktu.
    const lines: string[] = [];
    if (inquiry.industry) lines.push(`Obor: ${inquiry.industry}`);
    if (inquiry.product) lines.push(`Produkt: ${inquiry.product}`);
    if (inquiry.plan) lines.push(`Plán: ${inquiry.plan}`);
    if (inquiry.teamType) lines.push(`Režim: ${inquiry.teamType === "team" ? "tým" : "sólo"}`);
    if (inquiry.teamSize) lines.push(`Velikost týmu: ${inquiry.teamSize}`);
    if (inquiry.link) lines.push(`Odkaz: ${inquiry.link}`);
    if (inquiry.message) lines.push(`Zpráva: ${inquiry.message}`);
    if (inquiry.note) lines.push(`Poznámka: ${inquiry.note}`);
    if (source) lines.push(`Zdroj: ${source}`);

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
      inquiry,
      attribution,
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
      body: [data.name, data.email, source].filter(Boolean).join(" · "),
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
