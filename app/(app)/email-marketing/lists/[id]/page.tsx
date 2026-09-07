import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { ListDetailClient } from "@/components/email-marketing/list-detail-client";

interface Member {
  type: "prospect" | "client";
  id: string;
  name: string;
  email: string | null;
  category: string | null;
  status: string | null;
}

export default async function MarketingListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin", "member");
  const { id } = await params;
  const db = getAdminFirestore();

  const doc = await db.collection("marketingLists").doc(id).get();
  if (!doc.exists || doc.data()?.deletedAt) notFound();

  const d = doc.data()!;
  const prospectIds = (d.prospectIds as string[]) ?? [];
  const clientIds = (d.clientIds as string[]) ?? [];

  const refs = [
    ...prospectIds.map((pid) => db.collection("prospects").doc(pid)),
    ...clientIds.map((cid) => db.collection("clients").doc(cid)),
  ];
  const members: Member[] = [];
  if (refs.length > 0) {
    const docs = await db.getAll(...refs);
    for (const m of docs) {
      if (!m.exists || m.data()?.deletedAt) continue;
      const md = m.data()!;
      const type = m.ref.parent.id === "prospects" ? "prospect" : "client";
      members.push({
        type,
        id: m.id,
        name: (md.name as string) ?? "",
        email: (md.email as string) ?? null,
        category: (md.category as string) ?? null,
        status: type === "client" ? ((md.status as string) ?? null) : null,
      });
    }
    members.sort((a, b) => a.name.localeCompare(b.name, "cs"));
  }

  return (
    <ListDetailClient
      list={{
        id: doc.id,
        name: d.name as string,
        description: (d.description as string) ?? null,
      }}
      initialMembers={members}
    />
  );
}
