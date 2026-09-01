import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { domainFormSchema } from "@/lib/schemas/domain";
import { logActivity } from "@/lib/activity";

/** yyyy-mm-dd → Date (UTC půlnoc, konzistentní s porovnáváním v cronu). null smaže pole. */
function parseDate(value: string | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === "") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// GET /api/domains?clientId=xxx
export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const db = getAdminFirestore();
    if (!clientId) {
      return NextResponse.json({ error: "clientId je povinné" }, { status: 400 });
    }

    const snapshot = await db
      .collection("domains")
      .where("clientId", "==", clientId)
      .orderBy("createdAt", "desc")
      .get();

    const domains = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      purchasedAt: doc.data().purchasedAt?.toDate?.()?.toISOString() ?? null,
      renewalAt: doc.data().renewalAt?.toDate?.()?.toISOString() ?? null,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json(domains);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/domains
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { clientId, ...rest } = body as { clientId: string } & Record<string, unknown>;

    if (!clientId) {
      return NextResponse.json({ error: "clientId je povinné" }, { status: 400 });
    }

    const data = domainFormSchema.parse(rest);
    const db = getAdminFirestore();

    const clientDoc = await db.collection("clients").doc(clientId).get();
    if (!clientDoc.exists) {
      return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
    }

    const purchasedAt = parseDate(data.purchasedAt);
    const renewalAt = parseDate(data.renewalAt);

    const docRef = await db.collection("domains").add({
      clientId,
      name: data.name.trim(),
      registrar: data.registrar?.trim() || null,
      account: data.account?.trim() || null,
      hosting: data.hosting?.trim() || null,
      purchasedAt: purchasedAt ?? null,
      renewalAt: renewalAt ?? null,
      autoRenew: data.autoRenew ?? false,
      note: data.note?.trim() || null,
      renewalReminderSentAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    await logActivity({
      entityType: "client",
      entityId: clientId,
      kind: "system",
      text: `Doména „${data.name.trim()}" přidána`,
      actorUid: user.uid,
    });

    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/");
    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
