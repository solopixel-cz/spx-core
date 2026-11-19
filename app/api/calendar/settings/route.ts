import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";

/**
 * Osobní nastavení kalendáře (každý uživatel své):
 * - POST: nový soukromý odkaz pro Google Kalendář (starý přestane fungovat),
 * - DELETE: odkaz zruší,
 * - PATCH `{ digestEmail }`: ranní souhrn e-mailem zapnout / vypnout.
 */

async function deleteFeeds(db: FirebaseFirestore.Firestore, uid: string) {
  const snap = await db.collection("calendarFeeds").where("uid", "==", uid).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const status = message.includes("Forbidden") ? 403 : message.includes("Unauthorized") ? 401 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST() {
  try {
    const user = await requireRole("admin", "member");
    const db = getAdminFirestore();
    await deleteFeeds(db, user.uid);
    const token = randomBytes(24).toString("hex");
    await db.collection("calendarFeeds").doc(token).set({ uid: user.uid, createdAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ token });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireRole("admin", "member");
    await deleteFeeds(getAdminFirestore(), user.uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const body = (await request.json()) as { digestEmail?: unknown };
    if (typeof body.digestEmail !== "boolean") {
      return NextResponse.json({ error: "Chybí digestEmail" }, { status: 400 });
    }
    await getAdminFirestore()
      .collection("users")
      .doc(user.uid)
      .update({ calendarDigestEmail: body.digestEmail, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
