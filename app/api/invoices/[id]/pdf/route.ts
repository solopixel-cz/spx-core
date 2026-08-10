import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";
import { companySchema } from "@/lib/schemas/company";
import {
  renderInvoicePdf,
  type InvoicePdfData,
  type InvoicePdfItem,
} from "@/lib/pdf/invoice-pdf";

export const maxDuration = 30;

/**
 * Vygeneruje PDF faktury (vlastní generátor, nahrazuje Fakturoid).
 * Vrací `application/pdf` inline. Vyžaduje vyplněné `settings/company`.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin", "member");
    const { id } = await params;
    const db = getAdminFirestore();

    const snap = await db.collection("invoices").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 });
    }
    const invoice = snap.data()!;

    const companyDoc = await db.collection("settings").doc("company").get();
    if (!companyDoc.exists) {
      return NextResponse.json(
        { error: "Nejdřív vyplňte fakturační údaje v Nastavení" },
        { status: 400 }
      );
    }
    const company = companySchema.parse(companyDoc.data());

    const clientSnap = await db
      .collection("clients")
      .doc(invoice.clientId)
      .get();
    if (!clientSnap.exists) {
      return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
    }
    const client = clientSnap.data()!;

    const rawItems = invoice.items as InvoicePdfItem[] | undefined;
    const items: InvoicePdfItem[] =
      rawItems && rawItems.length > 0
        ? rawItems
        : [
            {
              description: `Faktura ${invoice.number}`,
              quantity: 1,
              unitPrice: invoice.amount as number,
            },
          ];

    const data: InvoicePdfData = {
      number: invoice.number as string,
      amount: invoice.amount as number,
      items,
      variableSymbol:
        (invoice.variableSymbol as string) ||
        (invoice.number as string).replace(/\D/g, ""),
      note: (invoice.note as string) ?? null,
      issuedAt: invoice.issuedAt?.toDate?.() ?? null,
      dueAt: invoice.dueAt?.toDate?.() ?? null,
    };

    const pdf = await renderInvoicePdf({
      invoice: data,
      company,
      client: {
        name: (client.name as string) || "Klient",
        company: client.company ?? null,
        ico: client.ico ?? null,
        dic: client.dic ?? null,
        billingStreet: client.billingStreet ?? null,
        billingZip: client.billingZip ?? null,
        billingCity: client.billingCity ?? null,
      },
    });

    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="faktura-${data.number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
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
