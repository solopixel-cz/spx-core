import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { invoiceFormSchema, invoiceItemsTotal } from "@/lib/schemas/invoice";
import { logActivity } from "@/lib/activity";

export async function GET(request: Request) {
  try {
    await requireRole("admin", "member");
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const db = getAdminFirestore();
    let snapshot;

    if (clientId) {
      snapshot = await db.collection("invoices").where("clientId", "==", clientId).orderBy("issuedAt", "desc").get();
    } else {
      snapshot = await db.collection("invoices").orderBy("issuedAt", "desc").get();
    }

    const now = new Date();
    const invoices = snapshot.docs.map((doc) => {
      const data = doc.data();
      const dueAt = data.dueAt?.toDate?.() ?? null;
      let status = data.status;
      // Derive overdue status
      if (status === "sent" && dueAt && dueAt < now) {
        status = "overdue";
      }
      return {
        id: doc.id,
        ...data,
        status,
        issuedAt: data.issuedAt?.toDate?.()?.toISOString() ?? null,
        dueAt: dueAt?.toISOString() ?? null,
        paidAt: data.paidAt?.toDate?.()?.toISOString() ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json(invoices);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const body = await request.json();
    const data = invoiceFormSchema.parse(body);

    const db = getAdminFirestore();

    // Generate invoice number via transaction on counters/invoices
    const counterRef = db.collection("counters").doc("invoices");
    const year = new Date().getFullYear();

    const number = await db.runTransaction(async (tx) => {
      const counterDoc = await tx.get(counterRef);
      let seq = 1;

      if (counterDoc.exists) {
        const counterData = counterDoc.data()!;
        if (counterData.year === year) {
          seq = (counterData.seq || 0) + 1;
        }
      }

      tx.set(counterRef, { year, seq });
      return `${year}-${String(seq).padStart(3, "0")}`;
    });

    const issuedAt = new Date();
    const dueAt = new Date(data.dueAt);
    const amount = invoiceItemsTotal(data.items);
    const variableSymbol =
      data.variableSymbol?.trim() || number.replace(/\D/g, "");
    const status = data.asDraft ? "draft" : "sent";

    const docRef = await db.collection("invoices").add({
      clientId: data.clientId,
      number,
      amount,
      items: data.items,
      variableSymbol,
      note: data.note?.trim() || null,
      issuedAt,
      dueAt,
      status,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    await logActivity({
      entityType: "invoice",
      entityId: docRef.id,
      kind: "system",
      text: `Faktura ${number} ${status === "draft" ? "uložena jako koncept" : "vystavena"} na ${amount.toLocaleString("cs-CZ")} Kč`,
      actorUid: user.uid,
    });

    return NextResponse.json({ id: docRef.id, number });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
