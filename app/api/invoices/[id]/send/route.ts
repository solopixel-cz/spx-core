import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/auth";
import { sendTransactionalEmail } from "@/lib/email";
import { logActivity } from "@/lib/activity";
import { companySchema } from "@/lib/schemas/company";
import {
  renderInvoicePdf,
  type InvoicePdfData,
  type InvoicePdfItem,
} from "@/lib/pdf/invoice-pdf";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!
  );
}

function fmtDate(ts: FirebaseFirestore.Timestamp | undefined): string {
  const d = ts?.toDate?.();
  return d ? d.toLocaleDateString("cs-CZ") : "—";
}

/**
 * Odeslání faktury klientovi e-mailem (přes Resend) + tracking (invoiceEmails).
 * Do fáze C (Fakturoid) bez PDF — platební údaje jsou v těle e-mailu.
 * Opakované odeslání je povolené (fakturu lze legitimně poslat znovu).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin", "member");
    const { id } = await params;

    const db = getAdminFirestore();
    const invoiceRef = db.collection("invoices").doc(id);
    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists) {
      return NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 });
    }
    const invoice = invoiceSnap.data()!;

    if (invoice.status === "cancelled") {
      return NextResponse.json(
        { error: "Stornovanou fakturu nelze odeslat" },
        { status: 400 }
      );
    }

    const clientSnap = await db.collection("clients").doc(invoice.clientId).get();
    if (!clientSnap.exists) {
      return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
    }
    const client = clientSnap.data()!;
    const toEmail = (client.email as string | undefined)?.trim();
    if (!toEmail) {
      return NextResponse.json(
        { error: "Klient nemá vyplněný e-mail" },
        { status: 400 }
      );
    }

    // Odesílatel = přihlášený uživatel (adresa na ověřené doméně solopixel.cz).
    const userSnap = await db.collection("users").doc(user.uid).get();
    const senderName = (userSnap.data()?.displayName as string) || "SoloPixel";

    const number = invoice.number as string;
    const amount = (invoice.amount as number).toLocaleString("cs-CZ");
    const variableSymbol =
      (invoice.variableSymbol as string) || number.replace(/\D/g, "");
    const clientName = (client.name as string) || "kliente";

    // Dodavatelské údaje (settings/company) — platební údaje, PDF, QR.
    const companyDoc = await db.collection("settings").doc("company").get();
    const company = companyDoc.exists
      ? companySchema.parse(companyDoc.data())
      : null;
    const bankAccount = company?.bankAccount || process.env.COMPANY_BANK_ACCOUNT;

    const pdfData: InvoicePdfData = {
      number,
      amount: invoice.amount as number,
      items:
        (invoice.items as InvoicePdfItem[] | undefined) &&
        (invoice.items as InvoicePdfItem[]).length > 0
          ? (invoice.items as InvoicePdfItem[])
          : [
              {
                description: `Faktura ${number}`,
                quantity: 1,
                unitPrice: invoice.amount as number,
              },
            ],
      variableSymbol,
      note: (invoice.note as string) ?? null,
      issuedAt: invoice.issuedAt?.toDate?.() ?? null,
      dueAt: invoice.dueAt?.toDate?.() ?? null,
    };

    const subject = `Faktura ${number}`;

    const lines: string[] = [
      `<p>Dobrý den, ${escapeHtml(clientName)},</p>`,
      `<p>zasíláme fakturu <strong>${escapeHtml(number)}</strong>.</p>`,
      `<ul>`,
      `<li>Částka: <strong>${amount} Kč</strong></li>`,
      `<li>Datum vystavení: ${fmtDate(invoice.issuedAt)}</li>`,
      `<li>Splatnost: ${fmtDate(invoice.dueAt)}</li>`,
      `<li>Variabilní symbol: ${escapeHtml(variableSymbol)}</li>`,
      bankAccount ? `<li>Číslo účtu: ${escapeHtml(bankAccount)}</li>` : "",
      `</ul>`,
      `<p>Fakturu v PDF (včetně QR platby) najdete v příloze.</p>`,
      `<p>Děkujeme za spolupráci.</p>`,
      `<p>${escapeHtml(senderName)}<br/>SoloPixel</p>`,
    ].filter(Boolean);
    const html = lines.join("\n");

    const text =
      `Dobrý den, ${clientName},\n\n` +
      `zasíláme fakturu ${number}.\n\n` +
      `Částka: ${amount} Kč\n` +
      `Datum vystavení: ${fmtDate(invoice.issuedAt)}\n` +
      `Splatnost: ${fmtDate(invoice.dueAt)}\n` +
      `Variabilní symbol: ${variableSymbol}\n` +
      (bankAccount ? `Číslo účtu: ${bankAccount}\n` : "") +
      `\nFakturu v PDF (včetně QR platby) najdete v příloze.\n` +
      `\nDěkujeme za spolupráci.\n${senderName}, SoloPixel`;

    // Příloha: PDF z vlastního generátoru (vyžaduje dodavatelské údaje).
    let attachments: { filename: string; content: Buffer }[] | undefined;
    if (company) {
      const pdf = await renderInvoicePdf({
        invoice: pdfData,
        company,
        client: {
          name: clientName,
          company: client.company ?? null,
          ico: client.ico ?? null,
          dic: client.dic ?? null,
          billingStreet: client.billingStreet ?? null,
          billingZip: client.billingZip ?? null,
          billingCity: client.billingCity ?? null,
        },
      }).catch(() => null);
      if (pdf) {
        attachments = [{ filename: `faktura-${number}.pdf`, content: pdf }];
      }
    }

    const result = await sendTransactionalEmail({
      to: toEmail,
      senderName,
      senderEmail: user.email,
      subject,
      html,
      text,
      attachments,
    });

    const resendId = (result as { id?: string } | null)?.id;
    if (!resendId) {
      return NextResponse.json(
        { error: "E-mail se nepodařilo odeslat" },
        { status: 502 }
      );
    }

    await db.collection("invoiceEmails").add({
      invoiceId: id,
      clientId: invoice.clientId,
      toEmail,
      senderUid: user.uid,
      resendId,
      subject,
      status: "sent",
      sentAt: FieldValue.serverTimestamp(),
      lastEventAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    // Koncept → odesláno (dnes create dělá rovnou "sent", ale ošetři i draft).
    if (invoice.status === "draft") {
      await invoiceRef.update({
        status: "sent",
        sentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await logActivity({
      entityType: "invoice",
      entityId: id,
      kind: "email",
      text: `Odeslána faktura ${number} klientovi (${toEmail})`,
      actorUid: user.uid,
    });

    return NextResponse.json({ ok: true });
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
