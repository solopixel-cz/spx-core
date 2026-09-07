import { requireRole } from "@/lib/auth";
import { TemplateEditorClient } from "@/components/email-marketing/template-editor-client";

export default async function NewEmailTemplatePage() {
  await requireRole("admin", "member");
  return <TemplateEditorClient />;
}
