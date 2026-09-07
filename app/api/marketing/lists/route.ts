import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { marketingListFormSchema } from "@/lib/schemas/marketing-list";

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
    const snap = await db
      .collection("marketingLists")
      .orderBy("updatedAt", "desc")
      .get();

    const lists = snap.docs
      .filter((d) => !d.data().deletedAt)
      .map((doc) => {
        const d = doc.data();
        const prospectIds = (d.prospectIds as string[]) ?? [];
        const clientIds = (d.clientIds as string[]) ?? [];
        return {
          id: doc.id,
          name: d.name as string,
          description: (d.description as string) ?? null,
          memberCount: prospectIds.length + clientIds.length,
          updatedAt: serializeTimestamp(d.updatedAt),
        };
      });

    return NextResponse.json({ lists });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const body = await request.json();
    const data = marketingListFormSchema.parse(body);

    const db = getAdminFirestore();
    const docRef = await db.collection("marketingLists").add({
      name: data.name,
      description: data.description || null,
      prospectIds: [],
      clientIds: [],
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
