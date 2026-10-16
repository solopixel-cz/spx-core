import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activity";
import { HUB_FEATURES, HUB_FEATURE_REQUIRES, hubFeatureDependents, hubFeaturesFrom, isHubFeature } from "@/lib/hub-features";

// PATCH /api/clients/[id]/hub-features — { feature: 'stats' | 'statsPlus' | 'references', enabled: boolean }
// Rozšířené statistiky jdou zapnout jen se Statistikami; vypnutí Statistik vypne i je.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { feature, enabled } = body as { feature?: unknown; enabled?: unknown };

    if (!isHubFeature(feature) || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Neplatná funkce" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const ref = db.collection("clients").doc(id);
    const doc = await ref.get();
    const data = doc.data();

    // Sales jen u svých klientů (stejně jako ostatní akce u klienta).
    if (!doc.exists || !data || (user.role === "sales" && data.salesOwnerUid !== user.uid)) {
      return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
    }

    const current = hubFeaturesFrom(data);
    const required = HUB_FEATURE_REQUIRES[feature];
    if (enabled && required && !current[required]) {
      return NextResponse.json(
        { error: `Nejdřív zapněte ${HUB_FEATURES[required]}, ${HUB_FEATURES[feature]} na ně navazují.` },
        { status: 409 }
      );
    }
    // Vypnutí funkce zhasne i ty, které na ní stojí.
    const alsoOff = enabled ? [] : hubFeatureDependents(feature).filter((f) => current[f]);

    await ref.update({
      [`hubFeatures.${feature}`]: enabled,
      ...Object.fromEntries(alsoOff.map((f) => [`hubFeatures.${f}`, false])),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const changed = [feature, ...alsoOff].map((f) => HUB_FEATURES[f]).join(" a ");
    await logActivity({
      entityType: "client",
      entityId: id,
      kind: "system",
      text: `SoloPixel HUB: ${changed} ${enabled ? "zapnuto" : "vypnuto"}`,
      actorUid: user.uid,
    });

    revalidatePath(`/clients/${id}`);
    return NextResponse.json({ status: "ok", alsoOff });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
