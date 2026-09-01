import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// GET /api/users — list all users (admin only)
export async function GET() {
  try {
    const admin = await requireRole("admin");
    void admin;

    const db = getAdminFirestore();
    const snapshot = await db.collection("users").orderBy("displayName").get();
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/users — create a new user (admin only)
export async function POST(request: Request) {
  try {
    const currentUser = await requireRole("admin");

    const { email, displayName, role } = (await request.json()) as {
      email: string;
      displayName: string;
      role: "admin" | "user";
    };

    if (!email || !displayName || !role) {
      return NextResponse.json(
        { error: "E-mail, jméno a role jsou povinné" },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();
    const db = getAdminFirestore();

    // Create Auth user with temporary password
    const tempPassword = Math.random().toString(36).slice(2) + "Aa1!";
    const userRecord = await auth.createUser({
      email,
      password: tempPassword,
      displayName,
    });

    // Set custom claim
    await auth.setCustomUserClaims(userRecord.uid, { role });

    // Create Firestore document
    await db.collection("users").doc(userRecord.uid).set({
      email,
      displayName,
      role,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: currentUser.uid,
    });

    return NextResponse.json({
      id: userRecord.uid,
      email,
      displayName,
      role,
      tempPassword,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
