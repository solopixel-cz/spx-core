import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { clientFormSchema } from "@/lib/schemas/client";
import { logActivity } from "@/lib/activity";
import { createOnboardingTasks } from "@/lib/onboarding";

// GET /api/clients
export async function GET() {
  try {
    const user = await requireAuth();
    const db = getAdminFirestore();

    const query = user.role === "sales"
      ? db.collection("clients").where("salesOwnerUid", "==", user.uid).orderBy("createdAt", "desc")
      : db.collection("clients").orderBy("createdAt", "desc");

    const snapshot = await query.get();

    const clients = snapshot.docs.filter((d) => !d.data().deletedAt).map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json(clients);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/clients
// Volitelně `prospectId` = převod kontaktu z Oslovení (vlastník kontaktu → obchodní
// vlastník klienta, kontakt → „converted") a `createOnboarding` (výchozí true) =
// onboarding úkoly ze šablony.
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = clientFormSchema.parse(body);
    const prospectId = typeof body.prospectId === "string" ? body.prospectId : null;
    const createOnboarding = body.createOnboarding !== false;

    const db = getAdminFirestore();

    // Převod z Oslovení — smí vlastník kontaktu nebo admin/member.
    let prospect: FirebaseFirestore.DocumentData | null = null;
    if (prospectId) {
      const prospectDoc = await db.collection("prospects").doc(prospectId).get();
      prospect = prospectDoc.exists && !prospectDoc.data()?.deletedAt ? prospectDoc.data()! : null;
      if (!prospect) {
        return NextResponse.json({ error: "Kontakt v Oslovení nenalezen" }, { status: 404 });
      }
      if (user.role === "sales" && prospect.ownerUid !== user.uid) {
        return NextResponse.json({ error: "Nemáte oprávnění" }, { status: 403 });
      }
      if (prospect.clientId) {
        return NextResponse.json({ error: "Z kontaktu už klient vznikl" }, { status: 409 });
      }
    }

    // Sales je vždy vlastníkem sám; jinak z payloadu, u převodu vlastník kontaktu.
    const salesOwnerUid =
      user.role === "sales"
        ? user.uid
        : body.salesOwnerUid || (prospect?.ownerUid as string | undefined) || null;

    const docRef = await db.collection("clients").add({
      ...data,
      salesOwnerUid,
      ...(prospectId ? { prospectId } : {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    await logActivity({
      entityType: "client",
      entityId: docRef.id,
      kind: "system",
      text: prospect
        ? `Klient „${data.name}" vytvořen z Oslovení`
        : `Klient „${data.name}" vytvořen`,
      actorUid: user.uid,
    });

    if (prospectId) {
      await db.collection("prospects").doc(prospectId).update({
        status: "converted",
        clientId: docRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      });
      await logActivity({
        entityType: "prospect",
        entityId: prospectId,
        kind: "status_change",
        text: `Převeden na klienta „${data.name}"`,
        actorUid: user.uid,
      });
    }

    let tasksGenerated = 0;
    if (createOnboarding) {
      try {
        tasksGenerated = await createOnboardingTasks(db, {
          clientId: docRef.id,
          assigneeUid: salesOwnerUid ?? user.uid,
          actorUid: user.uid,
        });
      } catch {
        // Onboarding úkoly jsou best-effort — klient už existuje.
      }
    }

    return NextResponse.json({ id: docRef.id, tasksGenerated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
