import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { SENDER_DOMAIN } from "@/lib/email";

// PATCH /api/users/[id] — update role or deactivate (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");

    const { id } = await params;
    const body = (await request.json()) as {
      role?: "admin" | "user";
      active?: boolean;
      commissionRate?: number | null;
      senderEmail?: string | null;
      senderName?: string | null;
    };

    const auth = getAdminAuth();
    const db = getAdminFirestore();
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.role) {
      await auth.setCustomUserClaims(id, { role: body.role });
      updates.role = body.role;
    }

    if (typeof body.active === "boolean") {
      await auth.updateUser(id, { disabled: !body.active });
      updates.active = body.active;
    }

    if (body.commissionRate !== undefined) {
      updates.commissionRate = body.commissionRate;
    }

    if (body.senderEmail !== undefined) {
      if (body.senderEmail && !body.senderEmail.endsWith(`@${SENDER_DOMAIN}`)) {
        return NextResponse.json(
          { error: `E-mail odesílatele musí být na doméně @${SENDER_DOMAIN}` },
          { status: 400 }
        );
      }
      updates.senderEmail = body.senderEmail || null;
    }

    if (body.senderName !== undefined) {
      updates.senderName = body.senderName || null;
    }

    await db.collection("users").doc(id).update(updates);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
