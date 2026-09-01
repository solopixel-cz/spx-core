import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth";

const STATUS_LABELS: Record<string, string> = {
  draft: "Koncept",
  sent: "Odesláno",
  paid: "Zaplaceno",
  overdue: "Po splatnosti",
  cancelled: "Stornováno",
};

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  // Escapuj středník, uvozovky a nové řádky (CZ Excel = středník).
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtDate(ts: FirebaseFirestore.Timestamp | undefined): string {
  const d = ts?.toDate?.();
  return d ? d.toLocaleDateString("cs-CZ") : "";
}

/**
 * CSV export faktur za období (dle data vystavení) pro účetní / daňové přiznání.
 * CRM je jediná evidence faktur (bez Fakturoidu). Oddělovač `;` + BOM kvůli
 * českému Excelu.
 *
 * GET /api/invoices/export?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    const from = fromStr ? new Date(`${fromStr}T00:00:00`) : null;
    const to = toStr ? new Date(`${toStr}T23:59:59.999`) : null;
    if ((fromStr && isNaN(from!.getTime())) || (toStr && isNaN(to!.getTime()))) {
      return NextResponse.json({ error: "Neplatné datum" }, { status: 400 });
    }

    const db = getAdminFirestore();

    let query: FirebaseFirestore.Query = db
      .collection("invoices")
      .orderBy("issuedAt", "asc");
    if (from) query = query.where("issuedAt", ">=", from);
    if (to) query = query.where("issuedAt", "<=", to);
    const snap = await query.get();

    // Klienti do mapy (jméno + IČO) — malý dataset.
    const clientsSnap = await db.collection("clients").get();
    const clientMap: Record<string, { name: string; ico: string }> = {};
    clientsSnap.docs.forEach((d) => {
      const data = d.data();
      clientMap[d.id] = {
        name: (data.name as string) ?? "",
        ico: (data.ico as string) ?? "",
      };
    });

    const header = [
      "Číslo faktury",
      "Klient",
      "IČO",
      "Variabilní symbol",
      "Datum vystavení",
      "Datum splatnosti",
      "Datum úhrady",
      "Stav",
      "Částka (Kč)",
    ];

    const rows = snap.docs.map((doc) => {
      const inv = doc.data();
      const client = clientMap[inv.clientId as string] ?? { name: "", ico: "" };
      const vs =
        (inv.variableSymbol as string) ||
        (inv.number as string)?.replace(/\D/g, "") ||
        "";
      return [
        inv.number as string,
        client.name,
        client.ico,
        vs,
        fmtDate(inv.issuedAt),
        fmtDate(inv.dueAt),
        fmtDate(inv.paidAt),
        STATUS_LABELS[inv.status as string] ?? (inv.status as string),
        inv.amount as number,
      ];
    });

    const csv =
      "﻿" +
      [header, ...rows]
        .map((r) => r.map(csvCell).join(";"))
        .join("\r\n");

    const suffix =
      fromStr || toStr ? `_${fromStr ?? "zac"}_${toStr ?? "dnes"}` : "";

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="faktury${suffix}.csv"`,
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
