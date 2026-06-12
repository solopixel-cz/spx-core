import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

// GET /api/commissions — admin/member gets all, sales gets own
export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const salesUid = searchParams.get("salesUid");
    const status = searchParams.get("status");

    const db = getAdminFirestore();
    let query: FirebaseFirestore.Query = db.collection("commissions");

    // Sales can only see their own
    if (user.role === "sales") {
      query = query.where("salesUid", "==", user.uid);
    } else if (salesUid) {
      query = query.where("salesUid", "==", salesUid);
    }

    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    const snap = await query.get();

    const commissions = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        invoiceId: d.invoiceId,
        clientId: d.clientId,
        salesUid: d.salesUid,
        baseAmount: d.baseAmount,
        rate: d.rate,
        amount: d.amount,
        status: d.status,
        payoutNote: d.payoutNote ?? null,
        earnedAt: serializeTimestamp(d.earnedAt),
        paidAt: serializeTimestamp(d.paidAt),
        createdAt: serializeTimestamp(d.createdAt),
      };
    });

    return NextResponse.json(commissions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/commissions — mark as paid (admin/member only)
export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user.role === "sales") {
      return NextResponse.json({ error: "Nemáte oprávnění" }, { status: 403 });
    }

    const body = await request.json();
    const { commissionIds, payoutNote } = body as {
      commissionIds: string[];
      payoutNote?: string;
    };

    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      return NextResponse.json({ error: "Žádné provize k vyplacení" }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Batch update in chunks of 500
    for (let i = 0; i < commissionIds.length; i += 500) {
      const batch = db.batch();
      const chunk = commissionIds.slice(i, i + 500);
      for (const commId of chunk) {
        const ref = db.collection("commissions").doc(commId);
        batch.update(ref, {
          status: "paid",
          paidAt: FieldValue.serverTimestamp(),
          payoutNote: payoutNote || null,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }

    return NextResponse.json({ status: "ok", count: commissionIds.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
