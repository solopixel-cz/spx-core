import { redirect } from "next/navigation";
import { loadClientForRoute } from "@/lib/client-route";
import { greetingName } from "@/lib/marketing/personalize";
import { FormPage } from "@/components/form-page";
import { SendEmailForm } from "@/components/clients/send-email-form";

export default async function SendEmailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, db, data, name, backHref, crumbs } = await loadClientForRoute(id);
  const clientEmail = (data.email as string | undefined) ?? "";
  // E-maily ze šablon posílá jen admin/member.
  if (user.role === "sales" || !clientEmail || data.deletedAt) redirect(backHref);

  const [templatesSnap, instSnap] = await Promise.all([
    db.collection("emailTemplates").orderBy("updatedAt", "desc").get(),
    db.collection("instances").where("clientId", "==", id).orderBy("createdAt", "desc").get(),
  ]);

  const templates = templatesSnap.docs
    .filter((d) => !d.data().deletedAt)
    .map((d) => ({
      id: d.id,
      name: d.data().name as string,
      subject: (d.data().subject as string | undefined) ?? null,
    }));

  const primaryInstance = instSnap.docs.find((d) => !d.data().deletedAt);
  const defaultLink = (primaryInstance?.data().deployUrl as string | undefined) ?? "";

  return (
    <FormPage
      backHref={backHref}
      breadcrumbs={crumbs("Poslat e-mail")}
      title="Poslat e-mail"
      description="E-mail ze šablony z Email marketingu, personalizovaný pro klienta."
      wide
    >
      <SendEmailForm
        clientId={id}
        clientName={name}
        defaultGreeting={greetingName({
          kind: data.kind as string | undefined,
          name,
          contactName: data.contactName as string | undefined,
        })}
        clientEmail={clientEmail}
        templates={templates}
        defaultLink={defaultLink}
        backHref={backHref}
      />
    </FormPage>
  );
}
