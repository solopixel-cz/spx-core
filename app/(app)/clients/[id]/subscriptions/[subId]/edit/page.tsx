import { notFound, redirect } from "next/navigation";
import { loadClientForRoute } from "@/lib/client-route";
import { loadSubInstanceOptions, toSubData } from "@/lib/subscription-data";
import { subscriptionLabel } from "@/lib/plans";
import { FormPage } from "@/components/form-page";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";

export default async function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string; subId: string }>;
}) {
  const { id, subId } = await params;
  const { user, db, backHref, crumbs } = await loadClientForRoute(id);
  if (user.role === "sales") redirect(backHref);

  const doc = await db.collection("subscriptions").doc(subId).get();
  if (!doc.exists || doc.data()?.clientId !== id) notFound();
  const subscription = toSubData(doc);

  return (
    <FormPage
      backHref={backHref}
      breadcrumbs={crumbs(subscriptionLabel(subscription))}
      title="Upravit předplatné"
    >
      <SubscriptionForm
        clientId={id}
        subscription={subscription}
        instances={await loadSubInstanceOptions(db, id)}
        backHref={backHref}
      />
    </FormPage>
  );
}
