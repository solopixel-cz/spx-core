import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { PROMO_COLLECTION } from "@/lib/promo-codes";
import { normalizePromoCode, promoCodeUpdateSchema } from "@/lib/schemas/promo-code";

type Params = { params: Promise<{ code: string }> };

// GET /api/promo-codes/[code] — poptávky, které kód použily (admin)
export async function GET(_request: Request, { params }: Params) {
  try {
    await requireRole("admin");
    const code = normalizePromoCode(decodeURIComponent((await params).code));
    const snap = await getAdminFirestore()
      .collection("prospects")
      .where("inquiry.promoCode", "==", code)
      .get();
    const uses = snap.docs
      .filter((d) => !d.data().deletedAt)
      .map((d) => {
        const data = d.data();
        const created = data.createdAt?.toDate?.() as Date | undefined;
        return {
          id: d.id,
          name: data.name as string,
          company: (data.company as string | null) ?? null,
          createdAt: created ? created.toISOString() : null,
        };
      })
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return NextResponse.json({ uses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/promo-codes/[code] — úprava popisu, platnosti, limitu, zapnutí (admin)
export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireRole("admin");
    const code = normalizePromoCode(decodeURIComponent((await params).code));
    const data = promoCodeUpdateSchema.parse(await request.json());

    const ref = getAdminFirestore().collection(PROMO_COLLECTION).doc(code);
    if (!(await ref.get()).exists) {
      return NextResponse.json({ error: "Kód neexistuje" }, { status: 404 });
    }
    await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/promo-codes/[code] — smazání jen nepoužitého kódu, jinak ho vypněte (admin)
export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireRole("admin");
    const code = normalizePromoCode(decodeURIComponent((await params).code));
    const ref = getAdminFirestore().collection(PROMO_COLLECTION).doc(code);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Kód neexistuje" }, { status: 404 });
    }
    if ((snap.data()?.usedCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "Použitý kód nejde smazat, můžete ho vypnout" },
        { status: 409 },
      );
    }
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
