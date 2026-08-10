import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { companySchema } from "@/lib/schemas/company";

// GET /api/settings/company — dodavatelské údaje pro fakturaci.
export async function GET() {
  try {
    await requireAuth();
    const db = getAdminFirestore();
    const doc = await db.collection("settings").doc("company").get();
    return NextResponse.json(doc.exists ? doc.data() : {});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/settings/company — jen admin.
export async function PUT(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const data = companySchema.parse(body);

    const db = getAdminFirestore();
    await db.collection("settings").doc("company").set(data);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
