import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import {
  isFakturoidConfigured,
  findOrCreateSubject,
  createInvoice,
  type FakturoidLine,
} from "@/lib/fakturoid";

/**
 * Odešle fakturu do Fakturoidu (vytvoří odběratele + fakturu). Manuální akce —
 * vytváří reálný účetní doklad. Idempotentní: pokud už `fakturoidId` existuje,
 * nic nevytváří.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin", "member");
    const { id } = await params;

    if (!isFakturoidConfigured()) {
      return NextResponse.json(
        { error: "Fakturoid není nakonfigurovaný (chybí FAKTUROID_* env)" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const ref = db.collection("invoices").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 });
    }
    const invoice = snap.data()!;

    if (invoice.fakturoidId) {
      return NextResponse.json({ ok: true, alreadyExists: true });
    }
    if (invoice.status === "cancelled") {
      return NextResponse.json(
        { error: "Stornovanou fakturu nelze poslat do Fakturoidu" },
        { status: 400 }
      );
    }

    const clientSnap = await db.collection("clients").doc(invoice.clientId).get();
    if (!clientSnap.exists) {
      return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
    }
    const client = clientSnap.data()!;

    const subjectId = await findOrCreateSubject({
      customId: invoice.clientId,
      name: (client.name as string) || "Klient",
      email: (client.email as string) || null,
    });

    // Řádky z položek faktury; fallback jednořádková faktura.
    const items = invoice.items as
      | { description: string; quantity: number; unitPrice: number }[]
      | undefined;
    const lines: FakturoidLine[] =
      items && items.length > 0
        ? items.map((it) => ({
            name: it.description,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            vat_rate: 0,
          }))
        : [
            {
              name: `Faktura ${invoice.number}`,
              quantity: 1,
              unit_price: invoice.amount as number,
              vat_rate: 0,
            },
          ];

    const issued = invoice.issuedAt?.toDate?.() ?? new Date();
    const due = invoice.dueAt?.toDate?.() ?? issued;
    const dueDays = Math.max(
      0,
      Math.round((due.getTime() - issued.getTime()) / 86400000)
    );

    const result = await createInvoice({
      subjectId,
      lines,
      dueDays,
      variableSymbol: invoice.variableSymbol as string | undefined,
      note: (invoice.note as string) || null,
    });

    await ref.update({
      fakturoidId: result.id,
      fakturoidNumber: result.number,
      fakturoidStatus: result.status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Ulož subjekt na klienta pro příští použití (neblokující chyby ignoruj).
    await clientSnap.ref
      .update({ fakturoidSubjectId: subjectId })
      .catch(() => {});

    await logActivity({
      entityType: "invoice",
      entityId: id,
      kind: "system",
      text: `Faktura odeslána do Fakturoidu (${result.number})`,
      actorUid: user.uid,
    });

    return NextResponse.json({ ok: true, fakturoidNumber: result.number });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
