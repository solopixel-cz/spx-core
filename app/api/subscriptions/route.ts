import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { subscriptionFormSchema } from "@/lib/schemas/subscription";

export async function GET(request: Request) {
  try {
    await requireRole("admin", "member");
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const db = getAdminFirestore();
    let query = db.collection("subscriptions").orderBy("createdAt", "desc");

    if (clientId) {
      query = db.collection("subscriptions").where("clientId", "==", clientId);
    }

    const snapshot = await query.get();
    const subs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startedAt: data.startedAt?.toDate?.()?.toISOString() ?? null,
        nextInvoiceAt: data.nextInvoiceAt?.toDate?.()?.toISOString() ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json(subs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const body = await request.json();
    const { clientId, ...rest } = body as { clientId: string } & Record<string, unknown>;
    const data = subscriptionFormSchema.parse(rest);

    if (!clientId) {
      return NextResponse.json({ error: "clientId je povinné" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const { startedAt: startedAtInput, nextInvoiceAt: nextInvoiceAtInput, ...subData } = data;
    const startedAt = startedAtInput ? new Date(startedAtInput) : new Date();
    let nextInvoice: Date;
    if (nextInvoiceAtInput) {
      nextInvoice = new Date(nextInvoiceAtInput);
    } else {
      nextInvoice = new Date(startedAt);
      if (data.billingCycle === "monthly") {
        nextInvoice.setMonth(nextInvoice.getMonth() + 1);
      } else {
        nextInvoice.setFullYear(nextInvoice.getFullYear() + 1);
      }
      // U startedAt v minulosti posuň příští fakturaci do budoucna
      const now = new Date();
      while (nextInvoice < now) {
        if (data.billingCycle === "monthly") {
          nextInvoice.setMonth(nextInvoice.getMonth() + 1);
        } else {
          nextInvoice.setFullYear(nextInvoice.getFullYear() + 1);
        }
      }
    }

    const docRef = await db.collection("subscriptions").add({
      ...subData,
      clientId,
      startedAt,
      nextInvoiceAt: nextInvoice,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
