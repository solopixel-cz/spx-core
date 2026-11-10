import { getAdminFirestore } from "@/lib/firebase/admin";
import { sendTransactionalEmail } from "@/lib/email";
import { pushToHubClient } from "@/lib/hub-push";
import { hubPageUrl } from "@/lib/hub";
import { renderTicketUpdateEmail, type TicketUpdateKind } from "@/lib/email-templates/ticket-update";

/**
 * Zpětná vazba z HUBu (tickets se `source: 'hub'`): e-mail a push klientovi
 * k odpovědi týmu nebo ke stavu „Čekání na klienta“ / „Hotovo“ (resolved). Posílá se
 * jen na pokyn týmu (zaškrtnutí u odpovědi, tlačítko v detailu ticketu),
 * změna stavu sama nic neposílá. E-mail jde na hubový účet, který ticket
 * založil (z adresy odesílatele v profilu člena týmu), push na zařízení
 * klienta (`push.tickets`). Nevyhazuje, výsledek e-mailu vrací.
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
}): Promise<{ email: "sent" | "skipped" | "failed"; error?: string }> {
  const { ticketId, ticket, kind } = params;
  if (ticket.source !== "hub") return { email: "skipped" };
  const path = `/feedback/${ticketId}`;
  const title = String(ticket.title ?? "Váš požadavek");

  const [, email] = await Promise.all([
    pushToHubClient(ticket.clientId, "tickets", { ...PUSH[kind](title), tag: `ticket-${ticketId}`, url: path }).catch((error) =>
      console.error("Ticket push failed:", error)
    ),
    (async () => {
      const link = hubPageUrl(path);
      if (!ticket.createdByEmail) return { email: "skipped" as const, error: "Ticket nemá e-mail klienta" };
      if (!link) return { email: "skipped" as const, error: "Chybí HUB_URL, e-mail nejde poslat" };
      const email = renderTicketUpdateEmail({ kind, ticketTitle: title, message: params.message, authorName: params.sender.displayName, link });
      await sendTransactionalEmail({
        to: ticket.createdByEmail,
        senderName: params.sender.name,
        senderEmail: params.sender.email,
        ...email,
      });
      return { email: "sent" as const };
    })().catch((error) => {
      console.error("Ticket e-mail failed:", error);
      return { email: "failed" as const, error: error instanceof Error ? error.message : "E-mail se nepodařilo odeslat" };
    }),
  ]);
  return email;
}
