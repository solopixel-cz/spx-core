import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "@/lib/auth";
import { pushSubscriptionSchema } from "@/lib/schemas/notification";

/**
 * Uloží Web Push odběr přihlášeného uživatele do
 * `users/{uid}/pushSubscriptions/{hash(endpoint)}`. Doc id je hash endpointu,
 * takže opakované volání ze stejného zařízení odběr jen aktualizuje (bez duplicit).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json().catch(() => ({}));
    const sub = pushSubscriptionSchema.parse(body);

    const id = createHash("sha256").update(sub.endpoint).digest("hex");
    const db = getAdminFirestore();
    await db
      .collection("users")
      .doc(user.uid)
      .collection("pushSubscriptions")
      .doc(id)
      .set(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
          userAgent: request.headers.get("user-agent") ?? null,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Unauthorized") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
