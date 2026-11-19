import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { logActivity } from "@/lib/activity";
import { shiftSubscriptionPeriod } from "@/lib/invoice-actions";
import { subscriptionLabel } from "@/lib/plans";

const bodySchema = z.object({ period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

const czDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return `${d}. ${m}. ${y}`;
};

/**
 * „Už vyfakturováno“ z kalendáře: POST posune příští fakturaci předplatného
 * o období `period` dál bez vystavení faktury, DELETE posun vrátí (Vrátit zpět).
 */
async function handle(request: Request, params: Promise<{ id: string }>, direction: "forward" | "back") {
  try {
    const user = await requireRole("admin", "member");
    const { id } = await params;
    const { period } = bodySchema.parse(await request.json());
    const db = getAdminFirestore();
    const next = await shiftSubscriptionPeriod(db, id, period, direction);
    if (!next) {
      return NextResponse.json({ error: "Příští fakturace se mezitím změnila, obnovte stránku" }, { status: 409 });
    }
    const sub = (await db.collection("subscriptions").doc(id).get()).data()!;
    await logActivity({
      entityType: "client",
      entityId: sub.clientId as string,
      kind: "system",
      text:
        direction === "forward"
          ? `${subscriptionLabel(sub)}: období od ${czDay(period)} označeno jako vyfakturované, příští fakturace ${czDay(next)}`
          : `${subscriptionLabel(sub)}: posun fakturace vrácen, příští fakturace ${czDay(next)}`,
      actorUid: user.uid,
    });
    return NextResponse.json({ nextInvoiceDay: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Forbidden") ? 403 : message.includes("Unauthorized") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, "forward");
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, "back");
}
