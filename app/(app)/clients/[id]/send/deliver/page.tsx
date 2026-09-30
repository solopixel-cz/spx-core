import { redirect } from "next/navigation";
import { loadClientForRoute } from "@/lib/client-route";
import { greetingName } from "@/lib/marketing/personalize";
import { FormPage } from "@/components/form-page";
import { DeliverCardForm } from "@/components/clients/deliver-card-form";

export default async function DeliverCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db, data, name, backHref, crumbs } = await loadClientForRoute(id);
  const clientEmail = (data.email as string | undefined) ?? "";

  const [instSnap, delSnap] = await Promise.all([
    db.collection("instances").where("clientId", "==", id).orderBy("createdAt", "desc").get(),
    db
      .collection("deliveryEmails")
      .where("clientId", "==", id)
      .orderBy("sentAt", "desc")
      .limit(1)
      .get(),
  ]);

  // Předává se jen vizitka (chybějící `type` = vizitka).
  const instances = instSnap.docs
    .filter((d) => !d.data().deletedAt && ((d.data().type as string | undefined) ?? "card") === "card")
    .map((d) => ({
      id: d.id,
      domain: d.data().domain as string,
      status: d.data().status as string,
    }));

  // Bez e-mailu nebo vizitky není co předat.
  if (!clientEmail || data.deletedAt || instances.length === 0) redirect(backHref);

  const delDoc = delSnap.docs[0];
  const lastDelivery = delDoc
    ? {
        id: delDoc.id,
        sentAt: delDoc.data().sentAt?.toDate?.()?.toISOString() ?? null,
        status: delDoc.data().status as string,
      }
    : null;

  return (
    <FormPage
      backHref={backHref}
      breadcrumbs={crumbs("Předat vizitku")}
      title="Předat vizitku"
      description="Klient dostane e-mail s odkazem na hotovou vizitku."
      wide
    >
      <DeliverCardForm
        clientId={id}
        clientName={name}
        defaultGreeting={greetingName({
          kind: data.kind as string | undefined,
          name,
          contactName: data.contactName as string | undefined,
        })}
        clientEmail={clientEmail}
        instances={instances}
        lastDelivery={lastDelivery}
        backHref={backHref}
      />
    </FormPage>
  );
}
