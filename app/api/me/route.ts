import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// GET /api/me — get own user profile
export async function GET() {
  try {
    const user = await requireAuth();
    const db = getAdminFirestore();
    const auth = getAdminAuth();

    const [userDoc, authUser] = await Promise.all([
      db.collection("users").doc(user.uid).get(),
      auth.getUser(user.uid),
    ]);

    const data = userDoc.data() ?? {};

    return NextResponse.json({
      uid: user.uid,
      email: user.email,
      displayName: data.displayName ?? "",
      role: data.role ?? user.role,
      phone: data.phone ?? null,
      photoURL: data.photoURL ?? null,
      commissionRate: data.commissionRate ?? null,
      senderEmail: data.senderEmail ?? null,
      senderName: data.senderName ?? null,
      createdAt: authUser.metadata.creationTime ?? null,
      lastSignIn: authUser.metadata.lastSignInTime ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/me — update own profile (whitelist: displayName, phone, photoURL)
export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // Whitelist: only these fields are allowed
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (typeof body.displayName === "string" && body.displayName.trim().length >= 2) {
      updates.displayName = body.displayName.trim();
    }
    if (body.phone !== undefined) {
      updates.phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    }
    if (body.photoURL !== undefined) {
      updates.photoURL = typeof body.photoURL === "string" ? body.photoURL : null;
    }

    const db = getAdminFirestore();
    await db.collection("users").doc(user.uid).update(updates);

    // Sync displayName and photoURL to Firebase Auth
    const authUpdates: Record<string, string | null> = {};
    if (updates.displayName) authUpdates.displayName = updates.displayName as string;
    if (updates.photoURL !== undefined) authUpdates.photoURL = (updates.photoURL as string) || null;

    if (Object.keys(authUpdates).length > 0) {
      const auth = getAdminAuth();
      await auth.updateUser(user.uid, authUpdates);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
