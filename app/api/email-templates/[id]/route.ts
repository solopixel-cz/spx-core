import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { emailTemplateFormSchema } from "@/lib/schemas/email-template";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin", "member");
    const { id } = await params;
    const db = getAdminFirestore();
    const doc = await db.collection("emailTemplates").doc(id).get();

    if (!doc.exists || doc.data()?.deletedAt) {
      return NextResponse.json({ error: "Šablona nenalezena" }, { status: 404 });
    }

    const d = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      name: d.name as string,
      subject: (d.subject as string) ?? null,
      html: (d.html as string) ?? "",
      createdAt: serializeTimestamp(d.createdAt),
      updatedAt: serializeTimestamp(d.updatedAt),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin", "member");
    const { id } = await params;
    const body = await request.json();
    const data = emailTemplateFormSchema.partial().parse(body);

    const db = getAdminFirestore();
    const docRef = db.collection("emailTemplates").doc(id);
    const existing = await docRef.get();
    if (!existing.exists || existing.data()?.deletedAt) {
      return NextResponse.json({ error: "Šablona nenalezena" }, { status: 404 });
    }

    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (data.name !== undefined) update.name = data.name;
    if (data.subject !== undefined) update.subject = data.subject || null;
    if (data.html !== undefined) update.html = data.html;

    await docRef.update(update);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin", "member");
    const { id } = await params;
    const db = getAdminFirestore();
    await db.collection("emailTemplates").doc(id).delete();
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
