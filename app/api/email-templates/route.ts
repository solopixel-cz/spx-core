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

export async function GET() {
  try {
    await requireRole("admin", "member");
    const db = getAdminFirestore();
    const snapshot = await db
      .collection("emailTemplates")
      .orderBy("updatedAt", "desc")
      .get();

    const templates = snapshot.docs
      .filter((d) => !d.data().deletedAt)
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name as string,
          subject: (d.subject as string) ?? null,
          html: (d.html as string) ?? "",
          createdAt: serializeTimestamp(d.createdAt),
          updatedAt: serializeTimestamp(d.updatedAt),
        };
      });

    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const body = await request.json();
    const data = emailTemplateFormSchema.parse(body);

    const db = getAdminFirestore();
    const docRef = await db.collection("emailTemplates").add({
      name: data.name,
      subject: data.subject || null,
      html: data.html ?? "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
