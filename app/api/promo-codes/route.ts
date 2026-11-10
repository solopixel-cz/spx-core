import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { PROMO_COLLECTION } from "@/lib/promo-codes";
import { promoCodeCreateSchema } from "@/lib/schemas/promo-code";

function iso(val: unknown): string | null {
  return val && typeof (val as { toDate?: unknown }).toDate === "function"
    ? (val as { toDate: () => Date }).toDate().toISOString()
    : null;
}

// GET /api/promo-codes — seznam promo kódů (admin)
export async function GET() {
  try {
    await requireRole("admin");
    const snap = await getAdminFirestore().collection(PROMO_COLLECTION).get();
    const codes = snap.docs.map((d) => {
      const data = d.data();
      return {
        code: data.code as string,
        description: (data.description as string | null) ?? null,
        validUntil: data.validUntil as string,
        maxUses: (data.maxUses as number | null) ?? null,
        usedCount: (data.usedCount as number) ?? 0,
        active: data.active !== false,
        createdAt: iso(data.createdAt),
        lastUsedAt: iso(data.lastUsedAt),
      };
    });
    return NextResponse.json({ codes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/promo-codes — nový promo kód (admin)
export async function POST(request: Request) {
  try {
    const user = await requireRole("admin");
    const data = promoCodeCreateSchema.parse(await request.json());

    const ref = getAdminFirestore().collection(PROMO_COLLECTION).doc(data.code);
    try {
      // create() selže, pokud kód už existuje.
      await ref.create({
        ...data,
        usedCount: 0,
        active: true,
        lastUsedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: user.uid,
      });
    } catch {
      return NextResponse.json({ error: `Kód ${data.code} už existuje` }, { status: 409 });
    }

    return NextResponse.json({ code: data.code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
