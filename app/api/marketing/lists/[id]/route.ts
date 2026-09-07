import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  marketingListFormSchema,
  marketingListMembersSchema,
} from "@/lib/schemas/marketing-list";

function serializeTimestamp(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

interface Member {
  type: "prospect" | "client";
  id: string;
  name: string;
  email: string | null;
  category: string | null;
}

/** Rozřeší ID členů na jména/e-maily/kategorie z prospektů a klientů. */
async function resolveMembers(
  db: FirebaseFirestore.Firestore,
  prospectIds: string[],
  clientIds: string[]
): Promise<Member[]> {
  const refs = [
    ...prospectIds.map((pid) => db.collection("prospects").doc(pid)),
    ...clientIds.map((cid) => db.collection("clients").doc(cid)),
  ];
  if (refs.length === 0) return [];

  const docs = await db.getAll(...refs);
  const members: Member[] = [];
  for (const doc of docs) {
    if (!doc.exists) continue;
    const d = doc.data()!;
    if (d.deletedAt) continue;
    const type = doc.ref.parent.id === "prospects" ? "prospect" : "client";
    members.push({
      type,
      id: doc.id,
      name: (d.name as string) ?? "",
      email: (d.email as string) ?? null,
      category: (d.category as string) ?? null,
    });
  }
  members.sort((a, b) => a.name.localeCompare(b.name, "cs"));
  return members;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin", "member");
    const { id } = await params;
    const db = getAdminFirestore();
    const doc = await db.collection("marketingLists").doc(id).get();

    if (!doc.exists || doc.data()?.deletedAt) {
      return NextResponse.json({ error: "Seznam nenalezen" }, { status: 404 });
    }

    const d = doc.data()!;
    const prospectIds = (d.prospectIds as string[]) ?? [];
    const clientIds = (d.clientIds as string[]) ?? [];
    const members = await resolveMembers(db, prospectIds, clientIds);

    return NextResponse.json({
      id: doc.id,
      name: d.name as string,
      description: (d.description as string) ?? null,
      prospectIds,
      clientIds,
      members,
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

    const db = getAdminFirestore();
    const docRef = db.collection("marketingLists").doc(id);
    const existing = await docRef.get();
    if (!existing.exists || existing.data()?.deletedAt) {
      return NextResponse.json({ error: "Seznam nenalezen" }, { status: 404 });
    }

    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

    // Název/popis
    const meta = marketingListFormSchema.partial().parse(body);
    if (meta.name !== undefined) update.name = meta.name;
    if (meta.description !== undefined) update.description = meta.description || null;

    // Členové (dedup)
    const members = marketingListMembersSchema.parse(body);
    if (members.prospectIds !== undefined) update.prospectIds = [...new Set(members.prospectIds)];
    if (members.clientIds !== undefined) update.clientIds = [...new Set(members.clientIds)];

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
    await db.collection("marketingLists").doc(id).delete();
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
