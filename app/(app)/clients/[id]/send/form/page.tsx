import { redirect } from "next/navigation";
import { loadClientForRoute } from "@/lib/client-route";
import { contactPersonName } from "@/lib/marketing/personalize";
import { FormPage } from "@/components/form-page";
import { CardFormSend } from "@/components/clients/card-form-send";

export default async function CardFormSendPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, backHref, crumbs } = await loadClientForRoute(id);
  const clientEmail = (data.email as string | undefined) ?? "";
  if (!clientEmail || data.deletedAt) redirect(backHref);

  return (
    <FormPage
      backHref={backHref}
      breadcrumbs={crumbs("Formulář podkladů")}
      title="Formulář podkladů"
      description="Klient dostane e-mailem odkaz, přes který vyplní podklady pro vizitku."
    >
      <CardFormSend
        clientId={id}
        clientName={contactPersonName({
          kind: data.kind as string | undefined,
          name: data.name as string,
          contactName: data.contactName as string | undefined,
        })}
        clientEmail={clientEmail}
        backHref={backHref}
      />
    </FormPage>
  );
}
