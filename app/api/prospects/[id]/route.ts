import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { prospectFormSchema, contactFormSchema } from "@/lib/schemas/prospect";
import { logActivity } from "@/lib/activity";
import { leadFormSchema } from "@/lib/schemas/lead";
import { renderSubject, sendOutreachEmail } from "@/lib/email";
import { renderOutreachEmail, DEFAULT_OUTREACH_SUBJECT } from "@/lib/email-templates/outreach";
import { renderFollowupEmail, DEFAULT_FOLLOWUP_SUBJECT } from "@/lib/email-templates/followup";
import type {
  OutreachContent,
  OutreachFeature,
  OutreachReference,
} from "@/lib/email-templates/outreach-content";
import {
  MAX_OUTREACH_FEATURES,
  MAX_OUTREACH_REFERENCES,
} from "@/lib/email-templates/outreach-content";
import { sanitizeRichHtml, stripHtml } from "@/lib/sanitize-html";

/** Sanitizace editovatelného obsahu oslovení před uložením do DB. */
function sanitizeOutreachContent(input: unknown): OutreachContent {
  const oc = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  const rawFeatures = Array.isArray(oc.features) ? oc.features : [];
  const features: OutreachFeature[] = rawFeatures
    .slice(0, MAX_OUTREACH_FEATURES)
    .map((f) => {
      const item = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
      return {
        title: stripHtml(String(item.title ?? "")).slice(0, 120),
        desc: stripHtml(String(item.desc ?? "")).slice(0, 400),
      };
    })
    .filter((f) => f.title || f.desc);

  const rawRefs = Array.isArray(oc.references) ? oc.references : [];
  const references: OutreachReference[] = rawRefs
    .slice(0, MAX_OUTREACH_REFERENCES)
    .map((r) => {
      const item = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
      return {
        label: stripHtml(String(item.label ?? "")).slice(0, 120),
        url: stripHtml(String(item.url ?? "")).slice(0, 500),
      };
    })
    .filter((r) => r.url);

  return {
    greeting: stripHtml(String(oc.greeting ?? "")).slice(0, 200),
    headline: stripHtml(String(oc.headline ?? "")).slice(0, 300),
    ctaLabel: stripHtml(String(oc.ctaLabel ?? "")).slice(0, 120),
    featuresHeading: stripHtml(String(oc.featuresHeading ?? "")).slice(0, 200),
    features,
    referencesText: stripHtml(String(oc.referencesText ?? "")).slice(0, 400),
    references,
    introHtml: sanitizeRichHtml(String(oc.introHtml ?? "")).slice(0, 8000),
    closingHtml: sanitizeRichHtml(String(oc.closingHtml ?? "")).slice(0, 8000),
  };
}

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const db = getAdminFirestore();
    const doc = await db.collection("prospects").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Prospekt nenalezen" }, { status: 404 });
    }

    const d = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      ...d,
      claimedAt: serializeTimestamp(d.claimedAt),
      lastTouchAt: serializeTimestamp(d.lastTouchAt),
      nextFollowUpAt: serializeTimestamp(d.nextFollowUpAt),
      createdAt: serializeTimestamp(d.createdAt),
      updatedAt: serializeTimestamp(d.updatedAt),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { outreachContent, ...rest } = body as Record<string, unknown>;
    const data = prospectFormSchema.partial().parse(rest);

    const db = getAdminFirestore();
    const docRef = db.collection("prospects").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Prospekt nenalezen" }, { status: 404 });
    }

    const update: Record<string, unknown> = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (outreachContent !== undefined && outreachContent !== null) {
      update.outreachContent = sanitizeOutreachContent(outreachContent);
    }

    await docRef.update(update);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// POST /api/prospects/[id] — actions: claim, release, contact, convert, not_interested, unreachable
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const action = body.action as string;

    const db = getAdminFirestore();
    const prospectRef = db.collection("prospects").doc(id);

    if (action === "claim") {
      // Transaction: set ownerUid only if currently null
      const result = await db.runTransaction(async (tx) => {
        const doc = await tx.get(prospectRef);
        if (!doc.exists) throw new Error("Prospekt nenalezen");
        const data = doc.data()!;
        if (data.ownerUid) {
          return { claimed: false };
        }
        tx.update(prospectRef, {
          ownerUid: user.uid,
          claimedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { claimed: true };
      });

      if (!result.claimed) {
        return NextResponse.json(
          { error: "Už zabráno kolegou" },
          { status: 409 }
        );
      }

      await logActivity({
        entityType: "prospect",
        entityId: id,
        kind: "system",
        text: "Prospekt zabrán",
        actorUid: user.uid,
      });

      return NextResponse.json({ status: "ok" });
    }

    if (action === "release") {
      const doc = await prospectRef.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Prospekt nenalezen" }, { status: 404 });
      }
      const data = doc.data()!;
      // Only owner or admin can release
      if (data.ownerUid !== user.uid && user.role !== "admin") {
        return NextResponse.json({ error: "Nemáte oprávnění" }, { status: 403 });
      }

      await prospectRef.update({
        ownerUid: null,
        claimedAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await logActivity({
        entityType: "prospect",
        entityId: id,
        kind: "system",
        text: "Prospekt uvolněn",
        actorUid: user.uid,
      });

      return NextResponse.json({ status: "ok" });
    }

    if (action === "contact") {
      const contactData = contactFormSchema.parse(body);
      const doc = await prospectRef.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Prospekt nenalezen" }, { status: 404 });
      }

      const prospectData = doc.data()!;
      const channelLabels: Record<string, string> = {
        phone: "telefon",
        email: "e-mail",
        linkedin: "LinkedIn",
        in_person: "osobně",
      };
      const resultLabels: Record<string, string> = {
        no_answer: "nedovoláno",
        left_message: "nechal vzkaz",
        conversation: "proběhl rozhovor",
        email_sent: "poslán e-mail",
      };

      const activityText = `Kontakt (${channelLabels[contactData.channel]}) — ${resultLabels[contactData.result]}${contactData.note ? `: ${contactData.note}` : ""}`;

      // Update prospect
      const updateData: Record<string, unknown> = {
        lastTouchAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (prospectData.status === "new") {
        updateData.status = "contacted";
      }
      if (contactData.result === "conversation") {
        updateData.status = "responding";
      }
      if (contactData.followUpAt) {
        updateData.nextFollowUpAt = new Date(contactData.followUpAt);
      }
      if (contactData.channel === "phone") {
        updateData.wasCalled = true;
      }

      await prospectRef.update(updateData);

      await logActivity({
        entityType: "prospect",
        entityId: id,
        kind: contactData.channel === "phone" ? "call" : "email",
        text: activityText,
        actorUid: user.uid,
      });

      return NextResponse.json({ status: "ok" });
    }

    if (action === "convert") {
      const doc = await prospectRef.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Prospekt nenalezen" }, { status: 404 });
      }
      const prospectData = doc.data()!;

      // Only owner or admin/member can convert
      if (
        prospectData.ownerUid !== user.uid &&
        user.role !== "admin" &&
        user.role !== "member"
      ) {
        return NextResponse.json({ error: "Nemáte oprávnění" }, { status: 403 });
      }

      // Create lead
      const leadData = leadFormSchema.parse({
        name: prospectData.name,
        company: prospectData.company || "",
        email: prospectData.email || "",
        phone: prospectData.phone || "",
        source: "outreach",
        stage: "new",
        ownerUid: prospectData.ownerUid || user.uid,
        notes: `Konvertováno z prospekta. ${prospectData.portalUrl ? `Profil: ${prospectData.portalUrl}` : ""}`.trim(),
      });

      const leadRef = await db.collection("leads").add({
        ...leadData,
        value: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: user.uid,
      });

      await prospectRef.update({
        status: "converted",
        leadId: leadRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await logActivity({
        entityType: "prospect",
        entityId: id,
        kind: "status_change",
        text: `Konvertován na lead`,
        actorUid: user.uid,
      });

      await logActivity({
        entityType: "lead",
        entityId: leadRef.id,
        kind: "system",
        text: `Lead vytvořen z prospekta „${prospectData.name}"`,
        actorUid: user.uid,
      });

      return NextResponse.json({ status: "ok", leadId: leadRef.id });
    }

    if (action === "not_interested" || action === "unreachable") {
      const note = body.note as string | undefined;
      await prospectRef.update({
        status: action,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const label = action === "not_interested" ? "Nemá zájem" : "Nedostupný";
      await logActivity({
        entityType: "prospect",
        entityId: id,
        kind: "status_change",
        text: `${label}${note ? `: ${note}` : ""}`,
        actorUid: user.uid,
      });

      return NextResponse.json({ status: "ok" });
    }

    if (action === "send_email") {
      const greeting = body.greeting as string | undefined;
      const doc = await prospectRef.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Prospekt nenalezen" }, { status: 404 });
      }
      const prospectData = doc.data()!;

      if (!prospectData.email) {
        return NextResponse.json({ error: "Prospekt nemá e-mail" }, { status: 400 });
      }
      // demoUrl je volitelný — bez něj se použije default demo.solopixel.cz (viz níže)

      // Check 7-day cooldown
      const recentEmail = await db
        .collection("outreachEmails")
        .where("prospectId", "==", id)
        .orderBy("sentAt", "desc")
        .limit(1)
        .get();

      if (!recentEmail.empty) {
        const lastSentAt = recentEmail.docs[0].data().sentAt?.toDate?.();
        if (lastSentAt) {
          const daysSince = (Date.now() - lastSentAt.getTime()) / 86400000;
          if (daysSince < 7) {
            const daysLeft = Math.ceil(7 - daysSince);
            return NextResponse.json(
              { error: `Oslovení bylo odesláno nedávno. Další je možné za ${daysLeft} dní.` },
              { status: 429 }
            );
          }
        }
      }

      // Load subject template
      const templateDoc = await db.collection("templates").doc("outreach-email").get();
      const subjectTemplate = (templateDoc.data()?.subject as string) || DEFAULT_OUTREACH_SUBJECT;

      // Get sender info (with optional override)
      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();
      const senderName = (userData?.senderName as string) || (userData?.displayName as string) || "SoloPixel";
      const senderEmail = (userData?.senderEmail as string) || user.email;
      const senderPhone = (userData?.phone as string) || undefined;

      // Editovatelný obsah oslovení (per-prospekt) — jinak výchozí.
      const savedContent = prospectData.outreachContent as Partial<OutreachContent> | undefined;

      // Render and send
      const jmeno = greeting || savedContent?.greeting || prospectData.name.split(" ")[0];
      const odkaz = prospectData.demoUrl || "https://demo.solopixel.cz";
      const renderedSubject = renderSubject(subjectTemplate, { jmeno, odkaz });
      const { html, text } = renderOutreachEmail({
        jmeno,
        odkaz,
        content: savedContent,
        senderName: (userData?.displayName as string) || senderName,
        senderPhone,
      });

      const result = await sendOutreachEmail({
        to: prospectData.email,
        senderName,
        senderEmail,
        subject: renderedSubject,
        html,
        text,
      });

      // Save outreach email record
      await db.collection("outreachEmails").add({
        prospectId: id,
        toEmail: prospectData.email,
        senderUid: user.uid,
        resendId: result?.id || "",
        subject: renderedSubject,
        status: "sent",
        sentAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: user.uid,
      });

      // Update prospect
      const updateData: Record<string, unknown> = {
        lastTouchAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (prospectData.status === "new") {
        updateData.status = "contacted";
      }
      // Set follow-up to +3 business days if not set
      if (!prospectData.nextFollowUpAt) {
        const followUp = new Date();
        let daysAdded = 0;
        while (daysAdded < 3) {
          followUp.setDate(followUp.getDate() + 1);
          const day = followUp.getDay();
          if (day !== 0 && day !== 6) daysAdded++;
        }
        updateData.nextFollowUpAt = followUp;
      }
      await prospectRef.update(updateData);

      await logActivity({
        entityType: "prospect",
        entityId: id,
        kind: "email",
        text: `Odesláno oslovení na ${prospectData.email}`,
        actorUid: user.uid,
      });

      return NextResponse.json({ status: "ok" });
    }

    if (action === "send_followup_email") {
      const greeting = body.greeting as string | undefined;
      const doc = await prospectRef.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Prospekt nenalezen" }, { status: 404 });
      }
      const prospectData = doc.data()!;

      if (!prospectData.email) {
        return NextResponse.json({ error: "Prospekt nemá e-mail" }, { status: 400 });
      }

      // Follow-up navazuje na první oslovení — musí existovat alespoň jeden odeslaný e-mail.
      const previousEmails = await db
        .collection("outreachEmails")
        .where("prospectId", "==", id)
        .orderBy("sentAt", "desc")
        .limit(1)
        .get();

      if (previousEmails.empty) {
        return NextResponse.json(
          { error: "Nejdřív odešlete první oslovení — follow-up na něj navazuje." },
          { status: 409 }
        );
      }

      // Min. 3denní odstup od posledního e-mailu, ať follow-up nechodí příliš brzy.
      const lastSentAt = previousEmails.docs[0].data().sentAt?.toDate?.();
      if (lastSentAt) {
        const daysSince = (Date.now() - lastSentAt.getTime()) / 86400000;
        if (daysSince < 3) {
          const daysLeft = Math.ceil(3 - daysSince);
          return NextResponse.json(
            { error: `Poslední e-mail odešel nedávno. Follow-up je vhodný za ${daysLeft} dní.` },
            { status: 429 }
          );
        }
      }

      // Load subject template
      const templateDoc = await db.collection("templates").doc("followup-email").get();
      const subjectTemplate = (templateDoc.data()?.subject as string) || DEFAULT_FOLLOWUP_SUBJECT;

      // Get sender info (with optional override)
      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();
      const senderName = (userData?.senderName as string) || (userData?.displayName as string) || "SoloPixel";
      const senderEmail = (userData?.senderEmail as string) || user.email;

      // Render and send
      const jmeno = greeting || prospectData.name.split(" ")[0];
      const odkaz = prospectData.demoUrl || "https://demo.solopixel.cz";
      const renderedSubject = renderSubject(subjectTemplate, { jmeno, odkaz });
      const { html, text } = renderFollowupEmail({ jmeno, odkaz });

      const result = await sendOutreachEmail({
        to: prospectData.email,
        senderName,
        senderEmail,
        subject: renderedSubject,
        html,
        text,
      });

      // Save email record (stejná kolekce jako oslovení — webhook tracking sdílený, odlišeno polem template)
      await db.collection("outreachEmails").add({
        prospectId: id,
        toEmail: prospectData.email,
        senderUid: user.uid,
        resendId: result?.id || "",
        subject: renderedSubject,
        status: "sent",
        template: "followup",
        sentAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: user.uid,
      });

      // Update prospect — posunout follow-up o +3 pracovní dny
      const followUp = new Date();
      let daysAdded = 0;
      while (daysAdded < 3) {
        followUp.setDate(followUp.getDate() + 1);
        const day = followUp.getDay();
        if (day !== 0 && day !== 6) daysAdded++;
      }
      await prospectRef.update({
        lastTouchAt: FieldValue.serverTimestamp(),
        nextFollowUpAt: followUp,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await logActivity({
        entityType: "prospect",
        entityId: id,
        kind: "email",
        text: `Odeslán follow-up na ${prospectData.email}`,
        actorUid: user.uid,
      });

      return NextResponse.json({ status: "ok" });
    }

    if (action === "send_test_email") {
      const toEmail = String(body.toEmail ?? "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
        return NextResponse.json({ error: "Zadejte platnou e-mailovou adresu" }, { status: 400 });
      }
      const template = body.template === "followup" ? "followup" : "outreach";
      const greeting = body.greeting as string | undefined;

      const doc = await prospectRef.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Prospekt nenalezen" }, { status: 404 });
      }
      const prospectData = doc.data()!;

      // Sender info
      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();
      const senderName = (userData?.senderName as string) || (userData?.displayName as string) || "SoloPixel";
      const senderEmail = (userData?.senderEmail as string) || user.email;
      const senderPhone = (userData?.phone as string) || undefined;

      const savedContent = prospectData.outreachContent as Partial<OutreachContent> | undefined;
      const jmeno = greeting || savedContent?.greeting || prospectData.name.split(" ")[0];
      const odkaz = prospectData.demoUrl || "https://demo.solopixel.cz";

      // Subject dle šablony + prefix [TEST]
      const templateId = template === "followup" ? "followup-email" : "outreach-email";
      const templateDoc = await db.collection("templates").doc(templateId).get();
      const defaultSubject = template === "followup" ? DEFAULT_FOLLOWUP_SUBJECT : DEFAULT_OUTREACH_SUBJECT;
      const subjectTemplate = (templateDoc.data()?.subject as string) || defaultSubject;
      const renderedSubject = `[TEST] ${renderSubject(subjectTemplate, { jmeno, odkaz })}`;

      const { html, text } =
        template === "followup"
          ? renderFollowupEmail({ jmeno, odkaz })
          : renderOutreachEmail({
              jmeno,
              odkaz,
              content: savedContent,
              senderName: (userData?.displayName as string) || senderName,
              senderPhone,
            });

      // Test — jen odeslat, žádný zápis do DB/aktivit, žádný cooldown.
      await sendOutreachEmail({
        to: toEmail,
        senderName,
        senderEmail,
        subject: renderedSubject,
        html,
        text,
      });

      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
