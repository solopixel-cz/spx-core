import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

interface ImportRow {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  city?: string;
  portalUrl?: string;
  demoUrl?: string;
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("admin", "member");
    const body = await request.json();
    const rows = body.rows as ImportRow[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Žádné řádky k importu" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const importBatchId = nanoid(10);

    // Optional owner assignment for all imported prospects
    const requestedOwnerUid =
      typeof body.ownerUid === "string" && body.ownerUid.trim() ? body.ownerUid.trim() : null;
    let ownerUid: string | null = null;
    if (requestedOwnerUid) {
      const ownerDoc = await db.collection("users").doc(requestedOwnerUid).get();
      if (!ownerDoc.exists) {
        return NextResponse.json({ error: "Vybraný vlastník neexistuje" }, { status: 400 });
      }
      ownerUid = requestedOwnerUid;
    }

    // Load existing prospects for dedup
    const existingSnap = await db.collection("prospects").get();
    const existingEmails = new Set<string>();
    const existingNames = new Map<string, Set<string>>(); // name -> companies

    existingSnap.docs.forEach((doc) => {
      const d = doc.data();
      if (d.email) existingEmails.add(d.email.toLowerCase());
      const name = (d.name as string).toLowerCase();
      if (!existingNames.has(name)) existingNames.set(name, new Set());
      existingNames.get(name)!.add((d.company as string || "").toLowerCase());
    });

    // Dedup
    const toImport: ImportRow[] = [];
    let skipped = 0;

    for (const row of rows) {
      if (!row.name || !row.name.trim()) {
        skipped++;
        continue;
      }

      // Check email dedup
      if (row.email && existingEmails.has(row.email.toLowerCase())) {
        skipped++;
        continue;
      }

      // Check name+company dedup (if no email)
      if (!row.email) {
        const nameLower = row.name.toLowerCase();
        const companyLower = (row.company || "").toLowerCase();
        const companies = existingNames.get(nameLower);
        if (companies?.has(companyLower)) {
          skipped++;
          continue;
        }
      }

      // Also dedup within the import batch
      if (row.email) {
        if (existingEmails.has(row.email.toLowerCase())) {
          skipped++;
          continue;
        }
        existingEmails.add(row.email.toLowerCase());
      } else {
        const nameLower = row.name.toLowerCase();
        const companyLower = (row.company || "").toLowerCase();
        if (!existingNames.has(nameLower)) existingNames.set(nameLower, new Set());
        if (existingNames.get(nameLower)!.has(companyLower)) {
          skipped++;
          continue;
        }
        existingNames.get(nameLower)!.add(companyLower);
      }

      toImport.push(row);
    }

    // Batch write in chunks of 500
    let imported = 0;
    for (let i = 0; i < toImport.length; i += 500) {
      const batch = db.batch();
      const chunk = toImport.slice(i, i + 500);

      for (const row of chunk) {
        const docRef = db.collection("prospects").doc();
        batch.set(docRef, {
          name: row.name.trim(),
          company: row.company?.trim() || null,
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          city: row.city?.trim() || null,
          portalUrl: row.portalUrl?.trim() || null,
          demoUrl: row.demoUrl?.trim() || null,
          status: "new",
          ownerUid,
          claimedAt: ownerUid ? FieldValue.serverTimestamp() : null,
          lastTouchAt: null,
          nextFollowUpAt: null,
          leadId: null,
          source: "import",
          importBatchId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: user.uid,
        });
        imported++;
      }

      await batch.commit();
    }

    return NextResponse.json({ imported, skipped, importBatchId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
