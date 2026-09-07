import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { TemplateEditorClient } from "@/components/email-marketing/template-editor-client";

export default async function EmailTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin", "member");
  const { id } = await params;
  const db = getAdminFirestore();

  const doc = await db.collection("emailTemplates").doc(id).get();
  if (!doc.exists || doc.data()?.deletedAt) notFound();

  const d = doc.data()!;
  const template = {
    id: doc.id,
    name: d.name as string,
    subject: (d.subject as string) ?? null,
    html: (d.html as string) ?? "",
  };

  return <TemplateEditorClient template={template} />;
}
