import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { costServiceFormSchema, parseAmount } from "@/lib/schemas/cost";
import { parseDate } from "@/lib/cost-store";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/costs/services/[id] — formulář posílá všechna pole
export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireRole("admin", "member");
    const { id } = await params;
    const data = costServiceFormSchema.parse(await request.json());
    const docRef = getAdminFirestore().collection("costServices").doc(id);
    if (!(await docRef.get()).exists) {
      return NextResponse.json({ error: "Služba nenalezena" }, { status: 404 });
    }

    await docRef.update({
      name: data.name.trim(),
      vendor: data.vendor?.trim() || null,
      category: data.category,
      billing: data.billing,
      amount: parseAmount(data.amount),
      currency: data.currency,
      nextPaymentAt: data.billing === "yearly" ? (parseDate(data.nextPaymentAt) ?? null) : null,
      startedAt: parseDate(data.startedAt) ?? new Date(),
      endedAt: data.billing === "once" ? null : (parseDate(data.endedAt) ?? null),
      note: data.note?.trim() || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath("/costs");
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/costs/services/[id] — trvale i se zapsanými platbami
export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireRole("admin", "member");
    const { id } = await params;
    const db = getAdminFirestore();
    const payments = await db.collection("costPayments").where("serviceId", "==", id).get();
    const batch = db.batch();
    payments.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(db.collection("costServices").doc(id));
    await batch.commit();

    revalidatePath("/costs");
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
