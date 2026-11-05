import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { cnbRates } from "@/lib/cnb";
import { monthKey, paymentId } from "@/lib/costs";
import { costPaymentFormSchema, parseAmount } from "@/lib/schemas/cost";
import { parseDate } from "@/lib/cost-store";

// POST /api/costs/payments — zápis skutečné platby za měsíc (přepíše dřívější zápis)
export async function POST(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const data = costPaymentFormSchema.parse(await request.json());
    const db = getAdminFirestore();

    const serviceRef = db.collection("costServices").doc(data.serviceId);
    const service = await serviceRef.get();
    if (!service.exists) {
      return NextResponse.json({ error: "Služba nenalezena" }, { status: 404 });
    }

    // Kurz ke dni platby; bez data poslední den měsíce, nejvýš dnes.
    const paidAt = parseDate(data.paidAt) ?? null;
    const [y, m] = data.month.split("-").map(Number);
    const rateDate = paidAt ?? new Date(Math.min(new Date(y, m, 0).getTime(), Date.now()));
    const { rates, approx } = await cnbRates(rateDate);
    if (approx && data.currency !== "CZK") {
      return NextResponse.json({ error: "Kurz ČNB se nepodařilo načíst, zkuste to za chvíli" }, { status: 503 });
    }
    const amount = parseAmount(data.amount);
    const rate = rates[data.currency];
    const ref = db.collection("costPayments").doc(paymentId(data.serviceId, data.month));
    const existing = await ref.get();

    await ref.set({
      serviceId: data.serviceId,
      month: data.month,
      amount,
      currency: data.currency,
      rate,
      amountCzk: Math.round(amount * rate),
      paidAt,
      note: data.note?.trim() || null,
      createdAt: existing.exists ? existing.data()?.createdAt : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: existing.exists ? existing.data()?.createdBy : user.uid,
    });

    // Roční služba: zaplacené výročí posune příští platbu o rok.
    const s = service.data()!;
    const next = s.nextPaymentAt?.toDate?.() as Date | undefined;
    if (s.billing === "yearly" && next && monthKey(next) <= data.month) {
      const moved = new Date(next);
      while (monthKey(moved) <= data.month) moved.setFullYear(moved.getFullYear() + 1);
      await serviceRef.update({ nextPaymentAt: moved, updatedAt: FieldValue.serverTimestamp() });
    }

    revalidatePath("/costs");
    return NextResponse.json({ id: ref.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
