import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { instanceFormPartialSchema } from "@/lib/schemas/instance";
import { logActivity } from "@/lib/activity";

// PATCH /api/instances/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { ga4Connected, searchConsoleConnected, ...data } = instanceFormPartialSchema.parse(body);

    const db = getAdminFirestore();
    const docRef = db.collection("instances").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        { error: "Instance nenalezena" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (data.features !== undefined) {
      updates.features = data.features
        ? data.features
            .split(",")
            .map((f: string) => f.trim())
            .filter(Boolean)
        : [];
    }

    // Přepnutí typu: vizitka drží slug, web drží hosting — druhé pole vyčistit.
    if (data.type !== undefined) {
      const isWeb = data.type === "web";
      updates.advisorSlug = isWeb ? null : data.advisorSlug?.trim() || null;
      updates.hosting = isWeb ? data.hosting || null : null;
    }

    if (data.repoUrl === "") updates.repoUrl = null;
    if (data.deployUrl === "") updates.deployUrl = null;
    if (data.ga4PropertyId === "") updates.ga4PropertyId = null;

    // Kontrola měření: zaškrtnutí uloží datum, odškrtnutí ho smaže.
    const checks: string[] = [];
    if (ga4Connected !== undefined) {
      updates.ga4ConnectedAt = ga4Connected ? FieldValue.serverTimestamp() : null;
      checks.push(`Google Analytics ${ga4Connected ? "napojeno" : "nenapojeno"}`);
    }
    if (searchConsoleConnected !== undefined) {
      updates.searchConsoleConnectedAt = searchConsoleConnected ? FieldValue.serverTimestamp() : null;
      checks.push(`Search Console ${searchConsoleConnected ? "napojeno" : "nenapojeno"}`);
    }

    await docRef.update(updates);

    const clientId = existing.data()?.clientId;
    if (clientId) {
      const domain = existing.data()?.domain;
      await logActivity({
        entityType: "client",
        entityId: clientId,
        kind: "system",
        text:
          checks.length > 0 && Object.keys(data).length === 0
            ? `Měření webu „${domain}": ${checks.join(", ")}`
            : `Instance „${domain}" aktualizována`,
        actorUid: user.uid,
      });
    }

    if (clientId) revalidatePath(`/clients/${clientId}`);
    revalidatePath("/");

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
