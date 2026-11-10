import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getSystemTemplate } from "@/lib/email-templates/system";
import { FormPage } from "@/components/form-page";
import { SystemTemplateEditor } from "@/components/email-marketing/system-template-editor";

/** Hotová šablona: úprava předmětu, náhled a testovací e-mail. */
export default async function SystemTemplatePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await requireRole("admin");
  const { key } = await params;
  const tpl = getSystemTemplate(key);
  if (!tpl) notFound();

  const backHref = "/email-marketing?tab=templates";
  return (
    <FormPage
      backHref={backHref}
      breadcrumbs={[
        { label: "Email marketing", href: "/email-marketing" },
        { label: "Šablony", href: backHref },
        { label: tpl.name },
      ]}
      title={tpl.name}
      description={tpl.description}
      wide
    >
      <SystemTemplateEditor templateKey={tpl.key} />
    </FormPage>
  );
}
