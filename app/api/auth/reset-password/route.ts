import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase/admin";

// POST /api/auth/reset-password — admin resets a user's password
export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const { uid } = (await request.json()) as { uid: string };

    if (!uid) {
      return NextResponse.json({ error: "uid je povinné" }, { status: 400 });
    }

    const auth = getAdminAuth();
    const tempPassword = Math.random().toString(36).slice(2) + "Aa1!";
    await auth.updateUser(uid, { password: tempPassword });

    return NextResponse.json({ tempPassword });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
