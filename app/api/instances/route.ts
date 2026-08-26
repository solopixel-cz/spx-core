import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { instanceFormSchema } from "@/lib/schemas/instance";
import { logActivity } from "@/lib/activity";

// GET /api/instances?clientId=xxx
export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const db = getAdminFirestore();
    let query = db.collection("instances").orderBy("createdAt", "desc");

    if (clientId) {
      query = db
        .collection("instances")
        .where("clientId", "==", clientId)
        .orderBy("createdAt", "desc");
    }

    const snapshot = await query.get();
    const instances = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json(instances);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/instances
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { clientId, ...rest } = body as { clientId: string } & Record<
      string,
      unknown
    >;
    const data = instanceFormSchema.parse(rest);

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId je povinné" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const isWeb = data.type === "web";
    const docRef = await db.collection("instances").add({
      ...data,
      clientId,
      // Vizitka má slug, web má hosting — druhé pole se drží prázdné.
      advisorSlug: isWeb ? null : data.advisorSlug?.trim() || null,
      hosting: isWeb ? data.hosting || null : null,
      repoUrl: data.repoUrl || null,
      deployUrl: data.deployUrl || null,
      features: data.features
        ? data.features
            .split(",")
            .map((f: string) => f.trim())
            .filter(Boolean)
        : [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    await logActivity({
      entityType: "client",
      entityId: clientId,
      kind: "system",
      text: `Instance „${data.domain}" přidána`,
      actorUid: user.uid,
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
