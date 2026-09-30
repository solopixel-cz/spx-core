import { loadClientForRoute } from "@/lib/client-route";
import { FormPage } from "@/components/form-page";
import { ClientForm } from "@/components/clients/client-form";
import type { ClientFormData } from "@/lib/schemas/client";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, backHref, crumbs } = await loadClientForRoute(id);

  return (
    <FormPage backHref={backHref} breadcrumbs={crumbs("Upravit")} title="Upravit klienta">
      <ClientForm
        cancelHref={backHref}
        defaultValues={{
          id,
          kind: (data.kind as ClientFormData["kind"] | undefined) ?? "person",
          name: data.name as string,
          contactName: (data.contactName as string | undefined) ?? "",
          company: (data.company as string | undefined) ?? "",
          ico: (data.ico as string | undefined) ?? "",
          dic: (data.dic as string | undefined) ?? "",
          billingStreet: (data.billingStreet as string | undefined) ?? "",
          billingZip: (data.billingZip as string | undefined) ?? "",
          billingCity: (data.billingCity as string | undefined) ?? "",
          email: (data.email as string | undefined) ?? "",
          phone: (data.phone as string | undefined) ?? "",
          status: data.status as ClientFormData["status"],
          notes: (data.notes as string | undefined) ?? "",
        }}
      />
    </FormPage>
  );
}
