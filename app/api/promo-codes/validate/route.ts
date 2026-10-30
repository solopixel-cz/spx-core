import { NextRequest, NextResponse } from "next/server";
import { checkPromoCode } from "@/lib/promo-codes";

/**
 * Živá kontrola promo kódu z formuláře na webu (spx-web /kontakt), bez
 * započítání použití. Volá se server-to-server přes webovou proxy se stejným
 * tajemstvím jako příjem poptávek (`x-ingest-secret` / `WEB_LEAD_INGEST_SECRET`).
 * Použití se počítá až při odeslání poptávky (`/api/leads/intake`).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.WEB_LEAD_INGEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "WEB_LEAD_INGEST_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("x-ingest-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  if (typeof body.code !== "string" || body.code.length > 100) {
    return NextResponse.json({ valid: false, reason: "not_found" });
  }

  const result = await checkPromoCode(body.code);
  // Popis kódu je interní poznámka pro tým, na web se neposílá.
  return NextResponse.json(
    result.valid
      ? { valid: true, code: result.code }
      : { valid: false, code: result.code, reason: result.reason },
  );
}
