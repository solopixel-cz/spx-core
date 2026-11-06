import { getAdminFirestore } from "@/lib/firebase/admin";
import { sendTransactionalEmail } from "@/lib/email";
import { pushToHubClient } from "@/lib/hub-push";
import { hubPageUrl } from "@/lib/hub";
import { renderTicketUpdateEmail, type TicketUpdateKind } from "@/lib/email-templates/ticket-update";

/**
 * Zpětná vazba z HUBu (tickets se `source: 'hub'`): klientovi dáme vědět,
 * když tým odpoví nebo ticket přepne na „Čeká na klienta“ či „Vyřešený“.
 * E-mail jde na hubový účet, který ticket založil (z adresy odesílatele
 * v profilu člena týmu), push na zařízení klienta (`push.tickets`).
 * Chyby jen loguje, odpověď ani změnu stavu nikdy neblokuje.
 */

const PUSH: Record<TicketUpdateKind, (title: string) => { title: string; body: string }> = {
  reply: (title) => ({ title: "Máte odpověď od SoloPixel", body: title }),
  waiting_client: (title) => ({ title: "Potřebujeme od vás doplnit informace", body: title }),
  resolved: (title) => ({ title: "Hotovo", body: `Vyřešili jsme: ${title}` }),
};

/** Jméno a adresa odesílatele z profilu člena týmu (stejně jako u e-mailů klientům). */
export async function teamSender(user: { uid: string; email: string }) {
  const data = (await getAdminFirestore().collection("users").doc(user.uid).get()).data();
  return {
    name: (data?.senderName as string) || (data?.displayName as string) || "SoloPixel",
    email: (data?.senderEmail as string) || user.email,
    displayName: (data?.displayName as string) || (data?.senderName as string) || "SoloPixel",
  };
}

export async function notifyHubClient(params: {
  ticketId: string;
  ticket: FirebaseFirestore.DocumentData;
  kind: TicketUpdateKind;
  message?: string;
  sender: { name: string; email: string; displayName: string };
}) {
  const { ticketId, ticket, kind } = params;
  if (ticket.source !== "hub") return;
  const path = `/feedback/${ticketId}`;
  const title = String(ticket.title ?? "Váš požadavek");

  await Promise.all([
    pushToHubClient(ticket.clientId, "tickets", { ...PUSH[kind](title), tag: `ticket-${ticketId}`, url: path }).catch((error) =>
      console.error("Ticket push failed:", error)
    ),
    (async () => {
      const link = hubPageUrl(path);
      if (!ticket.createdByEmail || !link) return;
      const email = renderTicketUpdateEmail({ kind, ticketTitle: title, message: params.message, authorName: params.sender.displayName, link });
      await sendTransactionalEmail({
        to: ticket.createdByEmail,
        senderName: params.sender.name,
        senderEmail: params.sender.email,
        ...email,
      });
    })().catch((error) => console.error("Ticket e-mail failed:", error)),
  ]);
}
