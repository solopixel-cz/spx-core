import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  DEFAULT_PROSPECT_CATEGORIES,
  prospectCategoryFormSchema,
} from "@/lib/schemas/prospect-category";

/** Sjednotí výchozí a uložené kategorie, deduplikuje (case-insensitive) a seřadí. */
function mergeCategories(stored: string[]): string[] {
  const seen = new Map<string, string>(); // lower -> original
  for (const name of [...DEFAULT_PROSPECT_CATEGORIES, ...stored]) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "cs"));
}

export async function GET() {
  try {
    await requireAuth();
    const db = getAdminFirestore();
    const snapshot = await db.collection("prospectCategories").get();
    const stored = snapshot.docs
      .map((d) => (d.data().name as string) ?? "")
      .filter(Boolean);

    return NextResponse.json({ categories: mergeCategories(stored) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name } = prospectCategoryFormSchema.parse(body);

    const db = getAdminFirestore();

    // Dedup proti výchozím i uloženým (case-insensitive) — kategorie už může existovat.
    const snapshot = await db.collection("prospectCategories").get();
    const stored = snapshot.docs
      .map((d) => (d.data().name as string) ?? "")
      .filter(Boolean);
    const existing = [...DEFAULT_PROSPECT_CATEGORIES, ...stored];
    const clash = existing.find((c) => c.toLowerCase() === name.toLowerCase());
    if (clash) {
      // Není chyba — jen vrátíme kanonický název, ať ho klient může rovnou vybrat.
      return NextResponse.json({ name: clash, existed: true });
    }

    await db.collection("prospectCategories").add({
      name,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
    });

    return NextResponse.json({ name, existed: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
