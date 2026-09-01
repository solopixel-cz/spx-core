import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logActivity } from "@/lib/activity";
import {
  invoiceFormSchema,
  invoiceItemsTotal,
  expandPeriodPlaceholders,
} from "@/lib/schemas/invoice";
import { markInvoicePaid, cancelInvoice } from "@/lib/invoice-actions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin");
    const { id } = await params;
    const body = (await request.json()) as { action: string } & Record<
      string,
      unknown
    >;

    const db = getAdminFirestore();
    const docRef = db.collection("invoices").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 });
    }

    const data = doc.data()!;

    if (body.action === "paid") {
      await markInvoicePaid(db, id, data, user.uid);
    } else if (body.action === "cancelled") {
      await cancelInvoice(db, id, data, user.uid);
    } else if (body.action === "update") {
      if (data.status !== "draft") {
        return NextResponse.json(
          { error: "Upravit lze jen koncept faktury" },
          { status: 400 }
        );
      }
      const parsed = invoiceFormSchema.parse(body);
      const issuedAt = data.issuedAt?.toDate?.() ?? new Date();
      const items = parsed.items.map((it) => ({
        ...it,
        description: expandPeriodPlaceholders(it.description, issuedAt),
      }));
      const amount = invoiceItemsTotal(items);
      const variableSymbol =
        parsed.variableSymbol?.trim() ||
        (data.number as string).replace(/\D/g, "");

      await docRef.update({
        clientId: parsed.clientId,
        items,
        amount,
        variableSymbol,
        note: parsed.note?.trim() || null,
        dueAt: new Date(parsed.dueAt),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await logActivity({
        entityType: "invoice",
        entityId: id,
        kind: "system",
        text: `Koncept faktury ${data.number} upraven`,
        actorUid: user.uid,
      });
    } else {
      return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Trvalé smazání faktury (jen admin). Na rozdíl od storna dokument odstraní
 * úplně — vč. navázané provize (`commissions/{id}` + `{id}-reversal`) a
 * odeslaných e-mailů (`invoiceEmails`). Smazání se zaloguje u klienta jako
 * audit stopa (číslo faktury zůstane v historii aktivit).
 *
 * Pozn.: CRM je jediná evidence faktur — smazáním vznikne mezera v číselné
 * řadě. Používat uvážlivě (spíš pro omyly/testy než pro ostré doklady).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin");
    const { id } = await params;

    const db = getAdminFirestore();
    const docRef = db.collection("invoices").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Faktura nenalezena" }, { status: 404 });
    }
    const data = doc.data()!;

    // Navázané e-maily faktury.
    const emailsSnap = await db
      .collection("invoiceEmails")
      .where("invoiceId", "==", id)
      .get();

    const batch = db.batch();
    emailsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(db.collection("commissions").doc(id));
    batch.delete(db.collection("commissions").doc(`${id}-reversal`));
    batch.delete(docRef);
    await batch.commit();

    // Audit stopa u klienta (faktura už neexistuje).
    if (data.clientId) {
      await logActivity({
        entityType: "client",
        entityId: data.clientId as string,
        kind: "system",
        text: `Faktura ${data.number} smazána`,
        actorUid: user.uid,
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Forbidden")
      ? 403
      : message.includes("Unauthorized")
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
