import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { NOTIFICATION_TOPICS } from "@/lib/notification-prefs";

// PATCH /api/me/notifications — zapne/vypne druh notifikace pro sebe
// body: { topic: string, enabled: boolean } nebo { digestEmail: boolean }
export async function PATCH(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const body = await request.json().catch(() => ({}));
    const db = getAdminFirestore();
    const ref = db.collection("users").doc(user.uid);

    if (typeof body.digestEmail === "boolean") {
      await ref.update({ calendarDigestEmail: body.digestEmail, updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ status: "ok" });
    }

    if (!NOTIFICATION_TOPICS.some((t) => t.key === body.topic) || typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "Neplatné nastavení" }, { status: 400 });
    }
    await ref.update({ [`notificationPrefs.${body.topic}`]: body.enabled, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
