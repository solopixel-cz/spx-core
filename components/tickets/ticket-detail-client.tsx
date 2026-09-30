"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ExternalLink, Loader2, Pencil, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toastWithUndo } from "@/lib/undo-toast";
import { formatDate } from "@/lib/format";
import {
  TICKET_STATUSES,
  ticketPriorityLabels,
  ticketPriorityVariants,
  ticketStatusLabels,
  ticketTypeLabels,
} from "@/lib/ticket-labels";
import type { TicketDetail } from "@/lib/ticket-route";

async function archiveCall(action: "archive" | "restore", id: string) {
  const res = await fetch("/api/archive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, collection: "tickets", id }),
  });
  if (!res.ok) throw new Error();
}

/** Detail ticketu (`/tickets/[id]`): obsah, přepínání stavu, úprava a archivace. */
export function TicketDetailClient({
  ticket,
  assigneeName,
  instanceDomain,
  editHref,
  backHref,
  canArchive,
}: {
  ticket: TicketDetail;
  assigneeName: string | null;
  instanceDomain: string | null;
  editHref: string;
  backHref: string;
  canArchive: boolean;
}) {
  const router = useRouter();
  const [changing, setChanging] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const archived = !!ticket.deletedAt;

  async function changeStatus(status: string) {
    setChanging(status);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Stav: ${ticketStatusLabels[status]}`);
      router.refresh();
    } catch {
      toast.error("Nepodařilo se změnit stav");
    } finally {
      setChanging(null);
    }
  }

  async function archive() {
    setArchiving(true);
    try {
      await archiveCall("archive", ticket.id);
      toastWithUndo({
        message: "Ticket archivován",
        undo: async () => {
          await archiveCall("restore", ticket.id);
          router.refresh();
        },
      });
      router.push(backHref);
      router.refresh();
    } catch {
      toast.error("Nepodařilo se archivovat ticket");
      setArchiving(false);
    }
  }

  async function restore() {
    setArchiving(true);
    try {
      await archiveCall("restore", ticket.id);
      toast.success("Ticket obnoven");
      router.refresh();
    } catch {
      toast.error("Nepodařilo se obnovit ticket");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {archived && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Archivováno {formatDate(ticket.deletedAt)}
          </p>
          {canArchive && (
            <Button variant="outline" size="sm" onClick={restore} disabled={archiving}>
              {archiving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Obnovit
            </Button>
          )}
        </div>
      )}

      <div className="rounded-2xl border bg-card p-4 shadow-xs md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">{ticket.title}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{ticketTypeLabels[ticket.type] ?? ticket.type}</Badge>
              <Badge variant={ticketPriorityVariants[ticket.priority] ?? "secondary"}>
                {ticketPriorityLabels[ticket.priority] ?? ticket.priority}
              </Badge>
              <Badge variant="secondary">{ticketStatusLabels[ticket.status] ?? ticket.status}</Badge>
            </div>
          </div>
          {!archived && (
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={editHref} />}>
                <Pencil className="mr-2 h-4 w-4" />
                Upravit
              </Button>
              {canArchive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={archive}
                  disabled={archiving}
                  className="text-muted-foreground"
                >
                  {archiving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="mr-2 h-4 w-4" />
                  )}
                  Archivovat
                </Button>
              )}
            </div>
          )}
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm">{ticket.description}</p>

        {ticket.links.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Odkazy</p>
            <ul className="space-y-1">
              {ticket.links.map((link, i) => (
                <li key={i}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 break-all text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Klient</dt>
            <dd>
              <Link href={`/clients/${ticket.clientId}?tab=tickety`} className="hover:underline">
                {ticket.clientName}
              </Link>
            </dd>
          </div>
          {instanceDomain && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Vizitka / web</dt>
              <dd>{instanceDomain}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Řešitel</dt>
            <dd>{assigneeName ?? "Nepřiřazeno"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Založeno</dt>
            <dd>{formatDate(ticket.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {!archived && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Změnit stav</p>
          <div className="flex flex-wrap gap-2">
            {TICKET_STATUSES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === ticket.status ? "default" : "outline"}
                onClick={() => changeStatus(s)}
                disabled={s === ticket.status || changing !== null}
              >
                {changing === s && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {ticketStatusLabels[s]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
