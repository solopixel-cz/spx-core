import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { domainFormSchema } from "@/lib/schemas/domain";
import { logActivity } from "@/lib/activity";

/** yyyy-mm-dd → Date (UTC půlnoc). "" smaže pole (null), undefined ponechá. */
function parseDate(value: string | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === "") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Načte doménu k editaci/smazání. */
async function loadAuthorizedDomain(id: string) {
  const db = getAdminFirestore();
  const docRef = db.collection("domains").doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return { error: 404 as const };
  const clientId = existing.data()?.clientId as string;
  return { docRef, existing, clientId };
}

// PATCH /api/domains/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = domainFormSchema.partial().parse(body);

    const res = await loadAuthorizedDomain(id);
    if ("error" in res) {
      return NextResponse.json({ error: "Doména nenalezena" }, { status: 404 });
    }
    const { docRef, existing, clientId } = res;

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.registrar !== undefined) updates.registrar = data.registrar.trim() || null;
    if (data.account !== undefined) updates.account = data.account.trim() || null;
    if (data.hosting !== undefined) updates.hosting = data.hosting.trim() || null;
    if (data.note !== undefined) updates.note = data.note.trim() || null;
    if (data.autoRenew !== undefined) updates.autoRenew = data.autoRenew;

    const purchasedAt = parseDate(data.purchasedAt);
    if (purchasedAt !== undefined) updates.purchasedAt = purchasedAt;

    const renewalAt = parseDate(data.renewalAt);
    if (renewalAt !== undefined) {
      updates.renewalAt = renewalAt;
      // Nový termín obnovení → připomínka pro tento cyklus začíná znovu.
      const prev = existing.data()?.renewalAt?.toDate?.()?.getTime();
      const next = renewalAt?.getTime();
      if (prev !== next) updates.renewalReminderSentAt = null;
    }

    await docRef.update(updates);

    await logActivity({
      entityType: "client",
      entityId: clientId,
      kind: "system",
      text: `Doména „${(updates.name as string) ?? existing.data()?.name}" upravena`,
      actorUid: user.uid,
    });

    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/");
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/domains/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const res = await loadAuthorizedDomain(id);
    if ("error" in res) {
      return NextResponse.json({ error: "Doména nenalezena" }, { status: 404 });
    }
    const { docRef, existing, clientId } = res;
    const name = existing.data()?.name as string;

    await docRef.delete();

    await logActivity({
      entityType: "client",
      entityId: clientId,
      kind: "system",
      text: `Doména „${name}" odebrána`,
      actorUid: user.uid,
    });

    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/");
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
