import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { loadClientForRoute } from "@/lib/client-route";
import { FormPage } from "@/components/form-page";
import { CardDeploymentForm } from "@/components/clients/card-deployment-form";
import { cardFallbackUrl } from "@/lib/card-hosts";
import { vercelConfigured } from "@/lib/vercel";

export default async function CardDeploymentPage({
  params,
}: {
  params: Promise<{ id: string; instanceId: string }>;
}) {
  const user = await requireRole("admin", "member");
  const { id, instanceId } = await params;
  const { db, data: client, backHref, crumbs } = await loadClientForRoute(id, "instance");

  const [doc, domainsSnap] = await Promise.all([
    db.collection("instances").doc(instanceId).get(),
    db.collection("domains").where("clientId", "==", id).get(),
  ]);
  const d = doc.data();
  if (!d || d.clientId !== id || d.deletedAt || (d.type ?? "card") !== "card" || !d.advisorSlug) notFound();
  const slug = d.advisorSlug as string;

  return (
    <FormPage
      backHref={backHref}
      breadcrumbs={crumbs("Nasazení vizitky")}
      title="Nasazení vizitky"
      full
      description="Adresy, na kterých vizitka běží, a nastavení, které si vizitka bere z CRM. Uložení se hned propíše do Vercelu."
    >
      <CardDeploymentForm
        instanceId={instanceId}
        backHref={backHref}
        fallbackUrl={cardFallbackUrl(slug)}
        status={d.status as string}
        vercel={vercelConfigured()}
        isAdmin={user.role === "admin"}
        clientEmail={client.email as string | undefined}
        clientDomains={domainsSnap.docs.filter((x) => !x.data().deletedAt).map((x) => x.data().name as string)}
        initial={{
          hostnames: (d.hostnames as string[] | undefined) ?? [],
          primaryHost: (d.primaryHost as string | undefined) ?? null,
          leadEmail: (d.leadEmail as string | undefined) ?? "",
          ga4MeasurementId: (d.ga4MeasurementId as string | undefined) ?? "",
          googleSiteVerification: (d.googleSiteVerification as string | undefined) ?? "",
          frameAncestors: (d.frameAncestors as string[] | undefined) ?? [],
        }}
      />
    </FormPage>
  );
}
