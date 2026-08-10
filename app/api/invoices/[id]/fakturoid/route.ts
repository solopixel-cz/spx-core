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
import { invoiceLineTotal } from "@/lib/schemas/invoice";

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
      | {
          description: string;
          quantity: number;
          unitPrice: number;
          discountPercent?: number;
        }[]
      | undefined;
    const lines: FakturoidLine[] =
      items && items.length > 0
        ? items.map((it) => {
            const d = it.discountPercent ?? 0;
            // Sleva promítnutá do jednotkové ceny (Fakturoid nemá slevu na řádku),
            // ať sedí řádkový součet s CRM. Sleva viditelná v názvu řádku.
            const line = invoiceLineTotal(it);
            const unit =
              it.quantity > 0 ? Math.round((line / it.quantity) * 100) / 100 : line;
            return {
              name: d > 0 ? `${it.description} (sleva ${d} %)` : it.description,
              quantity: it.quantity,
              unit_price: unit,
              vat_rate: 0,
            };
          })
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

    // Varianta B: Fakturoid = účetní pravda → přiřadí číslo i VS (nevnucujeme své).
    const result = await createInvoice({
      subjectId,
      lines,
      dueDays,
      note: (invoice.note as string) || null,
    });

    await ref.update({
      fakturoidId: result.id,
      fakturoidNumber: result.number,
      fakturoidStatus: result.status,
      // Převezmi číslo i VS z Fakturoidu jako kanonické.
      number: result.number,
      variableSymbol: result.variableSymbol ?? invoice.variableSymbol ?? null,
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
