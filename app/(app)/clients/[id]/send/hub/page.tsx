import { redirect } from "next/navigation";
import { loadClientForRoute } from "@/lib/client-route";
import { greetingName } from "@/lib/marketing/personalize";
import { hubLoginUrl } from "@/lib/hub";
import { FormPage } from "@/components/form-page";
import { HubInviteForm } from "@/components/clients/hub-invite-form";

export default async function HubInvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, name, backHref, crumbs } = await loadClientForRoute(id);
  const clientEmail = ((data.email as string | undefined) ?? "").trim().toLowerCase();

  // Bez e-mailu není kam pozvat; archivovaného klienta nezveme.
  if (!clientEmail || data.deletedAt) redirect(backHref);

  return (
    <FormPage
      backHref={backHref}
      breadcrumbs={crumbs("Pozvat do hubu")}
      title="Pozvat do klientské zóny"
      description="Klient dostane přístup do SoloPixel Hub a e-mail s návodem, jak se přihlásit."
      wide
    >
      <HubInviteForm
        clientId={id}
        clientName={name}
        defaultGreeting={greetingName({
          kind: data.kind as string | undefined,
          name,
          contactName: data.contactName as string | undefined,
        })}
        clientEmail={clientEmail}
        odkaz={hubLoginUrl(clientEmail)}
        invitedAt={data.hubInvitedAt?.toDate?.()?.toISOString() ?? null}
        backHref={backHref}
      />
    </FormPage>
  );
}
