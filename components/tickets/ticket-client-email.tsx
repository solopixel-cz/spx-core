"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

const COPY: Record<string, { button: string; subject: string }> = {
  waiting_client: { button: "Poslat e-mail: potřebujeme doplnit", subject: "Potřebujeme od vás doplnit informace" },
  resolved: { button: "Poslat e-mail: hotovo", subject: "Hotovo: váš požadavek je vyřešený" },
};

/**
 * Ruční e-mail klientovi ke stavu ticketu z HUBu (`POST /api/tickets/[id]/notify`).
 * Změna stavu sama nic neposílá. Jen ve stavu Čeká na klienta a Vyřešený.
 */
export function TicketClientEmail({
  ticketId,
  status,
  clientEmail,
  lastSent,
}: {
  ticketId: string;
  status: string;
  clientEmail: string | null;
  lastSent: { status: string; at: string | null } | null;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const copy = COPY[status];
  if (!copy) return null;
  const sentForStatus = lastSent?.status === status ? lastSent : null;

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/notify`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success("E-mail klientovi odeslán");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "E-mail se nepodařilo odeslat");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 p-3">
      <div className="min-w-0 text-xs text-muted-foreground">
        <p>
          E-mail „{copy.subject}“{clientEmail ? ` na ${clientEmail}` : ""} s odkazem do HUBu.
        </p>
        <p className="mt-0.5">
          {sentForStatus
            ? `Odesláno ${sentForStatus.at ? formatDateTime(sentForStatus.at) : ""}.`
            : "Zatím neodesláno."}
        </p>
      </div>
      <Button size="sm" variant={sentForStatus ? "outline" : "default"} onClick={send} disabled={sending || !clientEmail} className="shrink-0">
        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
        {sentForStatus ? "Poslat znovu" : copy.button}
      </Button>
    </div>
  );
}
