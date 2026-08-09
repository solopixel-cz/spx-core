import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { leadIntakeSchema } from "@/lib/schemas/lead";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";

/**
 * Veřejný příjem poptávek z marketingového webu (spx-web, /kontakt).
 *
 * Volá se server-to-server z webové proxy routy (`spx-web/pages/api/lead.ts`) —
 * stejný vzor jako `submissions/notify`. Chráněno sdíleným tajemstvím
 * (`x-ingest-secret` / env `WEB_LEAD_INGEST_SECRET`). Vlastník leadu se bere
 * z env `LEADS_DEFAULT_OWNER_UID`, nikdy z payloadu. Zdroj = "web", fáze = "new".
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
    const data = leadIntakeSchema.parse(body);

    // Doplňkové odpovědi z formuláře poskládáme do čitelné poznámky.
    const noteLines: string[] = [];
    if (data.industry) noteLines.push(`Obor: ${data.industry}`);
    if (data.product) noteLines.push(`Produkt: ${data.product}`);
    if (data.plan) noteLines.push(`Plán: ${data.plan}`);
    if (data.teamType)
      noteLines.push(`Režim: ${data.teamType === "team" ? "tým" : "sólo"}`);
    if (data.teamSize) noteLines.push(`Velikost týmu: ${data.teamSize}`);
    if (data.message) noteLines.push(`Zpráva: ${data.message}`);

    const db = getAdminFirestore();
    const docRef = await db.collection("leads").add({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      source: "web",
      stage: "new",
      value: null,
      ownerUid,
      notes: noteLines.join("\n") || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: "web-intake",
    });

    await logActivity({
      entityType: "lead",
      entityId: docRef.id,
      kind: "system",
      text: `Lead „${data.name}" přišel z webu`,
      actorUid: ownerUid,
    });

    await notify({
      type: "lead.web",
      title: "Nová poptávka z webu",
      body: data.email ? `${data.name} · ${data.email}` : data.name,
      href: "/leady",
      entityType: "lead",
      entityId: docRef.id,
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
