import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";

interface Candidate {
  type: "prospect" | "client";
  id: string;
  name: string;
  email: string | null;
  category: string | null;
  status: string | null; // stav klienta (active/paused/…); u prospektů null
}

/**
 * Sjednocený seznam kontaktů pro marketing — z existujících prospektů a klientů.
 * Slouží jako zdroj pro sestavování seznamů (picker).
 */
export async function GET() {
  try {
    await requireRole("admin", "member");
    const db = getAdminFirestore();

    const [prospectsSnap, clientsSnap] = await Promise.all([
      db.collection("prospects").get(),
      db.collection("clients").get(),
    ]);

    const candidates: Candidate[] = [];

    prospectsSnap.docs.forEach((doc) => {
      const d = doc.data();
      if (d.deletedAt) return;
      candidates.push({
        type: "prospect",
        id: doc.id,
        name: (d.name as string) ?? "",
        email: (d.email as string) ?? null,
        category: (d.category as string) ?? null,
        status: null,
      });
    });

    clientsSnap.docs.forEach((doc) => {
      const d = doc.data();
      if (d.deletedAt) return;
      candidates.push({
        type: "client",
        id: doc.id,
        name: (d.name as string) ?? "",
        email: (d.email as string) ?? null,
        category: (d.category as string) ?? null,
        status: (d.status as string) ?? null,
      });
    });

    candidates.sort((a, b) => a.name.localeCompare(b.name, "cs"));

    return NextResponse.json({ contacts: candidates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
