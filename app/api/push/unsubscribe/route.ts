import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/auth";

/**
 * Smaže Web Push odběr přihlášeného uživatele (podle endpointu). Volá se při
 * vypnutí notifikací na zařízení.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json().catch(() => ({}));
    const endpoint = body?.endpoint;
    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    const id = createHash("sha256").update(endpoint).digest("hex");
    const db = getAdminFirestore();
    await db
      .collection("users")
      .doc(user.uid)
      .collection("pushSubscriptions")
      .doc(id)
      .delete();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Unauthorized") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
