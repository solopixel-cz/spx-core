import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { domainFormSchema, parsePrice } from "@/lib/schemas/domain";
import { logActivity } from "@/lib/activity";

/** yyyy-mm-dd → Date (UTC půlnoc). "" smaže pole (null), undefined ponechá. */
function parseDate(value: string | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === "") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Ověří, že přihlášený smí sahat na doménu (sales jen vlastní klienty,
 * nepřiřazené domény jen admin/member).
 */
async function loadAuthorizedDomain(id: string, user: { uid: string; role: string }) {
  const db = getAdminFirestore();
  const docRef = db.collection("domains").doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return { error: 404 as const };
  const clientId = (existing.data()?.clientId as string | null | undefined) ?? null;
  if (user.role === "sales") {
    if (!clientId) return { error: 404 as const };
    const clientDoc = await db.collection("clients").doc(clientId).get();
    if (!clientDoc.exists || clientDoc.data()?.salesOwnerUid !== user.uid) {
      return { error: 404 as const };
    }
  }
  return { db, docRef, existing, clientId };
}

async function logDomain(clientId: string | null, text: string, actorUid: string) {
  if (!clientId) return;
  await logActivity({ entityType: "client", entityId: clientId, kind: "system", text, actorUid });
  revalidatePath(`/clients/${clientId}`);
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

    const res = await loadAuthorizedDomain(id, user);
    if ("error" in res) {
      return NextResponse.json({ error: "Doména nenalezena" }, { status: 404 });
    }
    const { db, docRef, existing, clientId } = res;

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.registrar !== undefined) updates.registrar = data.registrar.trim() || null;
    if (data.account !== undefined) updates.account = data.account.trim() || null;
    if (data.hosting !== undefined) updates.hosting = data.hosting.trim() || null;
    if (data.note !== undefined) updates.note = data.note.trim() || null;
    if (data.autoRenew !== undefined) updates.autoRenew = data.autoRenew;
    const price = parsePrice(data.price);
    if (price !== undefined) updates.price = price;

    // Přiřazení klienta mění jen správa domén (admin/member).
    let nextClientId = clientId;
    if (data.clientId !== undefined && (data.clientId.trim() || null) !== clientId) {
      if (user.role === "sales") {
        return NextResponse.json({ error: "Klienta domény mění jen admin" }, { status: 403 });
      }
      nextClientId = data.clientId.trim() || null;
      if (nextClientId) {
        const clientDoc = await db.collection("clients").doc(nextClientId).get();
        if (!clientDoc.exists) {
          return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
        }
      }
      updates.clientId = nextClientId;
    }

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

    const name = (updates.name as string) ?? (existing.data()?.name as string);
    if (nextClientId !== clientId) {
      await logDomain(clientId, `Doména „${name}" přesunuta k jinému klientovi`, user.uid);
      await logDomain(nextClientId, `Doména „${name}" přiřazena`, user.uid);
    } else {
      await logDomain(clientId, `Doména „${name}" upravena`, user.uid);
    }

    revalidatePath("/domains");
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

    const res = await loadAuthorizedDomain(id, user);
    if ("error" in res) {
      return NextResponse.json({ error: "Doména nenalezena" }, { status: 404 });
    }
    const { docRef, existing, clientId } = res;
    const name = existing.data()?.name as string;

    await docRef.delete();

    await logDomain(clientId, `Doména „${name}" odebrána`, user.uid);

    revalidatePath("/domains");
    revalidatePath("/");
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
