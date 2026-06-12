import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";

export async function GET() {
  try {
    await requireAuth();
    const db = getAdminFirestore();
    const doc = await db.collection("settings").doc("commission").get();
    return NextResponse.json(doc.exists ? doc.data() : { defaultRate: 0.2 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const { defaultRate } = body as { defaultRate: number };

    if (typeof defaultRate !== "number" || defaultRate < 0 || defaultRate > 1) {
      return NextResponse.json({ error: "Sazba musí být 0–1" }, { status: 400 });
    }

    const db = getAdminFirestore();
    await db.collection("settings").doc("commission").set({ defaultRate });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
