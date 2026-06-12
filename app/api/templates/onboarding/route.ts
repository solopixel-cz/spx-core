import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";

export async function GET() {
  try {
    await requireAuth();
    const db = getAdminFirestore();
    const doc = await db.collection("templates").doc("onboarding").get();

    if (!doc.exists) {
      return NextResponse.json({ steps: [] });
    }

    return NextResponse.json(doc.data());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();

    const db = getAdminFirestore();
    await db.collection("templates").doc("onboarding").set(body);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
