import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { costServiceFormSchema, parseAmount } from "@/lib/schemas/cost";
import { parseDate } from "@/lib/cost-store";

// POST /api/costs/services — nová placená služba (admin, member)
export async function POST(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const data = costServiceFormSchema.parse(await request.json());

    const docRef = await getAdminFirestore().collection("costServices").add({
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    revalidatePath("/costs");
    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
