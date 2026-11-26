import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { ZodError } from "zod";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { webFeedbackSchema } from "@/lib/schemas/web-feedback";
import { reasonLabel } from "@/lib/web-feedback";
import { attributionSummary } from "@/lib/attribution";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";

/**
 * Příjem odpovědí z dotazu při odchodu z webu (spx-web `pages/api/exit-feedback.ts`).
 *
 * Každá odpověď se uloží do `webFeedback` (seznam „Zpětná vazba z webu").
 * Když návštěvník u „Něco jiného" nechá kontakt, vznikne i kontakt v Oslovení
 * (`source=web`, `inquiry.place=exit`) s notifikací `lead.web`. Text bez kontaktu
 * pošle notifikaci `feedback.web`, odpovědi na jedno kliknutí se jen ukládají.
 *
 * Server-to-server, stejné tajemství jako poptávky (`x-ingest-secret` /
 * `WEB_LEAD_INGEST_SECRET`), vlastník kontaktu z `LEADS_DEFAULT_OWNER_UID`.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NO_NAME = "Bez jména (odchod z webu)";

export async function POST(request: NextRequest) {
  const secret = process.env.WEB_LEAD_INGEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "WEB_LEAD_INGEST_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("x-ingest-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const data = webFeedbackSchema.parse(body);
    const isOther = data.reason === "jine";
    const message = isOther ? data.message ?? null : null;
    const contact = isOther ? data.contact ?? null : null;

    const attribution = {
      utmSource: data.utm_source ?? null,
      utmMedium: data.utm_medium ?? null,
      utmCampaign: data.utm_campaign ?? null,
      utmContent: data.utm_content ?? null,
      referrer: data.referrer ?? null,
      landingPage: data.landing_page ?? null,
    };
    const source = attributionSummary(attribution);

    const db = getAdminFirestore();
    const feedbackRef = db.collection("webFeedback").doc();
    const ownerUid = process.env.LEADS_DEFAULT_OWNER_UID;

    // Kontakt z odpovědi = kontakt v Oslovení (jen když je komu ho přidělit).
    let prospectId: string | null = null;
    if (contact && ownerUid) {
      const prospectRef = db.collection("prospects").doc();
      prospectId = prospectRef.id;
      const isEmail = EMAIL.test(contact);
      await prospectRef.set({
        name: NO_NAME,
        company: null,
        email: isEmail ? contact : null,
        phone: isEmail ? null : contact,
        city: null,
        category: null,
        portalUrl: null,
        demoUrl: null,
        status: "new",
        source: "web",
        inquiry: {
          industry: null,
          product: null,
          plan: null,
          teamType: null,
          teamSize: null,
          link: null,
          promoCode: null,
          message,
          note: null,
          place: "exit",
          page: data.page ?? null,
          segment: null,
          chatQuestions: null,
        },
        attribution,
        ownerUid,
        claimedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: "web-feedback",
      });
    }

    await feedbackRef.set({
      reason: data.reason,
      message,
      contact,
      page: data.page ?? null,
      device: data.device,
      seconds: data.seconds ?? null,
      pages: data.pages ?? null,
      attribution,
      prospectId,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (prospectId && ownerUid) {
      const lines = [
        `Místo na webu: Dotaz při odchodu${data.page ? ` (${data.page})` : ""}`,
        `Zpráva: ${message}`,
        `Kontakt: ${contact}`,
        source && `Zdroj: ${source}`,
      ].filter(Boolean);
      await logActivity({
        entityType: "prospect",
        entityId: prospectId,
        kind: "system",
        text: `Odpověď při odchodu z webu\n${lines.join("\n")}`,
        actorUid: ownerUid,
      });
      await notify({
        type: "lead.web",
        title: "Kontakt z dotazu při odchodu",
        body: [contact, message, source].filter(Boolean).join(" · "),
        href: `/prospects/${prospectId}`,
        entityType: "prospect",
        entityId: prospectId,
      });
    } else if (message) {
      await notify({
        type: "feedback.web",
        title: "Zpětná vazba z webu",
        body: [reasonLabel(data.reason), message, data.page].filter(Boolean).join(" · "),
        href: "/web-feedback",
      });
    }

    return NextResponse.json({ id: feedbackRef.id, prospectId });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "invalid", issues: error.issues.map((i) => i.path.join(".")) }, { status: 400 });
    }
    console.error("[web-feedback/intake]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
