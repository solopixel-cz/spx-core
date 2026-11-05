import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";

// DELETE /api/costs/payments/[id] — měsíc se pak zase počítá podle plánu
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin", "member");
    const { id } = await params;
    await getAdminFirestore().collection("costPayments").doc(id).delete();
    revalidatePath("/costs");
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
