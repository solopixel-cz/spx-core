import { redirect } from "next/navigation";
import { loadClientForRoute } from "@/lib/client-route";
import { loadSubInstanceOptions } from "@/lib/subscription-data";
import { FormPage } from "@/components/form-page";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";

export default async function NewSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, db, data, backHref, crumbs } = await loadClientForRoute(id);
  // Předplatné spravuje jen admin/member.
  if (user.role === "sales" || data.deletedAt) redirect(backHref);

  return (
    <FormPage backHref={backHref} breadcrumbs={crumbs("Nové předplatné")} title="Založit předplatné">
      <SubscriptionForm
        clientId={id}
        instances={await loadSubInstanceOptions(db, id)}
        backHref={backHref}
      />
    </FormPage>
  );
}
