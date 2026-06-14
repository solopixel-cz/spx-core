import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { prospectFormSchema, contactFormSchema } from "@/lib/schemas/prospect";
import { logActivity } from "@/lib/activity";
import { leadFormSchema } from "@/lib/schemas/lead";
import { renderSubject, sendOutreachEmail } from "@/lib/email";
import { renderOutreachEmail, DEFAULT_OUTREACH_SUBJECT } from "@/lib/email-templates/outreach";

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
    const data = prospectFormSchema.partial().parse(body);

    const db = getAdminFirestore();
    const docRef = db.collection("prospects").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Prospekt nenalezen" }, { status: 404 });
    }

    await docRef.update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });

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

      // Render and send
      const jmeno = greeting || prospectData.name.split(" ")[0];
      const odkaz = prospectData.demoUrl || "https://demo.solopixel.cz";
      const renderedSubject = renderSubject(subjectTemplate, { jmeno, odkaz });
      const { html, text } = renderOutreachEmail({ jmeno, odkaz });

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

    return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
