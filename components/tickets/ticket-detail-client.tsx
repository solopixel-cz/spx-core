"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  ExternalLink,
  GitPullRequest,
  Link2,
  Loader2,
  Maximize2,
  Pencil,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastWithUndo } from "@/lib/undo-toast";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  TICKET_STATUSES,
  ticketColumn,
  ticketPriorityLabels,
  ticketPriorityVariants,
  ticketStatusLabels,
  ticketTypeLabels,
} from "@/lib/ticket-labels";
import type { TicketDetail, TicketMessage } from "@/lib/ticket-route";
import { TicketFiles, TicketThread } from "@/components/tickets/ticket-thread";
import { TicketClientEmail } from "@/components/tickets/ticket-client-email";

const NONE = "__none__";

async function archiveCall(action: "archive" | "restore", id: string) {
  const res = await fetch("/api/archive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, collection: "tickets", id }),
  });
  if (!res.ok) throw new Error();
}

/** Doplní https:// když chybí schéma. */
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** GitHub PR jako „spx-core #145“, jiný odkaz jako adresa bez protokolu. */
function prLabel(url: string): string {
  const m = url.match(/github\.com\/[^/]+\/([^/]+)\/pull\/(\d+)/i);
  if (m) return `${m[1]} #${m[2]}`;
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/**
 * Detail ticketu: na stránce `/backlog/[id]` i v modálu nad nástěnkou (`inModal`).
 * Vlevo obsah (popis, přílohy, odkazy, PR, vlákno s klientem), vpravo vlastnosti,
 * stav, řešitel a priorita se mění rovnou tady.
 */
export function TicketDetailClient({
  ticket,
  messages,
  users,
  instanceDomain,
  editHref,
  backHref,
  canArchive,
  inModal = false,
}: {
  ticket: TicketDetail;
  messages: TicketMessage[];
  users: { id: string; name: string }[];
  instanceDomain: string | null;
  editHref: string;
  backHref: string;
  canArchive: boolean;
  inModal?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const archived = !!ticket.deletedAt;
  const column = ticketColumn(ticket.status);
  const detailPath = `/backlog/${ticket.id}`;

  const assigneeItems: Record<string, string> = {
    [NONE]: "Nepřiřazeno",
    ...Object.fromEntries(users.map((u) => [u.id, u.name])),
  };
  if (ticket.assigneeUid && !assigneeItems[ticket.assigneeUid]) assigneeItems[ticket.assigneeUid] = "Neaktivní uživatel";
  const statusItems = Object.fromEntries(TICKET_STATUSES.map((s) => [s, ticketStatusLabels[s]]));

  function close() {
    if (inModal) router.back();
    else router.push(backHref);
  }

  async function patch(field: string, body: Record<string, unknown>, success?: string) {
    setSaving(field);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      if (success) toast.success(success);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Nepodařilo se uložit");
      return false;
    } finally {
      setSaving(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${detailPath}`);
      toast.success("Odkaz zkopírován");
    } catch {
      toast.error("Odkaz se nepodařilo zkopírovat");
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
      close();
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
    <div className={cn(!inModal && "max-w-5xl space-y-4")}>
      {archived && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Archivováno {formatDate(ticket.deletedAt)}
          </p>
          {canArchive && (
            <Button variant="outline" size="sm" onClick={restore} disabled={archiving}>
              {archiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Obnovit
            </Button>
          )}
        </div>
      )}

      <div className={cn("overflow-hidden", !inModal && "rounded-2xl border bg-card shadow-xs")}>
        {/* Hlavička: štítky, akce, název */}
        <header className="border-b p-4 md:px-6 md:py-5">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <Badge variant="outline">{ticketTypeLabels[ticket.type] ?? ticket.type}</Badge>
              {ticket.source === "hub" && <Badge>Z HUBu</Badge>}
              {!ticket.clientId && <Badge variant="secondary">Interní</Badge>}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button variant="ghost" size="icon-sm" onClick={copyLink} title="Kopírovat odkaz" aria-label="Kopírovat odkaz">
                <Link2 className="h-4 w-4" />
              </Button>
              {inModal && (
                // Plné načtení stránky, jinak by se odkaz znovu otevřel v modálu.
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={<a href={detailPath} />}
                  title="Otevřít na celé stránce"
                  aria-label="Otevřít na celé stránce"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
              {!archived && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  nativeButton={false}
                  render={<Link href={editHref} />}
                  title="Upravit"
                  aria-label="Upravit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {!archived && canArchive && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={archive}
                  disabled={archiving}
                  title="Archivovat"
                  aria-label="Archivovat"
                >
                  {archiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                </Button>
              )}
              {inModal && (
                <Button variant="ghost" size="icon-sm" onClick={close} title="Zavřít" aria-label="Zavřít">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight md:text-2xl">{ticket.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Založeno {formatDate(ticket.createdAt)}
            {ticket.createdByName ? ` · ${ticket.createdByName}` : ""}
          </p>
        </header>

        <div className="grid md:grid-cols-[minmax(0,1fr)_17rem]">
          {/* Vlastnosti: na mobilu nahoře, na desktopu vpravo */}
          <aside className="space-y-4 border-b bg-muted/30 p-4 md:order-2 md:border-b-0 md:border-l md:px-5 md:py-6">
            <Field label="Stav">
              <Select
                items={statusItems}
                value={column}
                disabled={archived || saving !== null}
                onValueChange={(val) => {
                  if (val && val !== column) patch("status", { status: val }, `Stav: ${ticketStatusLabels[val]}`);
                }}
              >
                <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((s) => <SelectItem key={s} value={s}>{ticketStatusLabels[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {ticket.source === "hub" && !archived && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Klient stav vidí v HUBu. E-mail mu změna nepošle, u „Čekání na klienta“ a „Hotovo“ ho pošlete tlačítkem.
                </p>
                <TicketClientEmail
                  ticketId={ticket.id}
                  status={ticket.status}
                  clientEmail={ticket.createdByEmail}
                  lastSent={ticket.clientNotified}
                />
              </div>
            )}
            <Field label="Řešitel">
              <Select
                items={assigneeItems}
                value={ticket.assigneeUid ?? NONE}
                disabled={archived || saving !== null}
                onValueChange={(val) => {
                  if (!val || val === (ticket.assigneeUid ?? NONE)) return;
                  patch("assignee", { assigneeUid: val === NONE ? "" : val });
                }}
              >
                <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(assigneeItems).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priorita">
              <Select
                items={ticketPriorityLabels}
                value={ticket.priority}
                disabled={archived || saving !== null}
                onValueChange={(val) => {
                  if (val && val !== ticket.priority) patch("priority", { priority: val });
                }}
              >
                <SelectTrigger className="w-full bg-background">
                  <Badge variant={ticketPriorityVariants[ticket.priority] ?? "secondary"}>
                    {ticketPriorityLabels[ticket.priority] ?? ticket.priority}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ticketPriorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <dl className="space-y-2.5 border-t pt-4 text-sm">
              <Prop label="Klient">
                {ticket.clientId ? (
                  <Link href={`/clients/${ticket.clientId}?tab=tickety`} className="font-medium hover:underline">
                    {ticket.clientName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Interní</span>
                )}
              </Prop>
              {instanceDomain && <Prop label="Vizitka / web">{instanceDomain}</Prop>}
              <Prop label="Typ">{ticketTypeLabels[ticket.type] ?? ticket.type}</Prop>
              <Prop label="Zdroj">{ticket.source === "hub" ? "HUB (od klienta)" : "CRM"}</Prop>
              {ticket.createdByName && <Prop label="Založil(a)">{ticket.createdByName}</Prop>}
              <Prop label="Založeno">{formatDateTime(ticket.createdAt)}</Prop>
              {ticket.updatedAt && <Prop label="Upraveno">{formatDateTime(ticket.updatedAt)}</Prop>}
            </dl>
          </aside>

          {/* Obsah */}
          <div className="min-w-0 space-y-6 p-4 md:px-6 md:py-6">
            <section>
              <SectionTitle>Popis</SectionTitle>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
              <TicketFiles files={ticket.attachments} />
            </section>

            {ticket.links.length > 0 && (
              <section>
                <SectionTitle>Odkazy</SectionTitle>
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
              </section>
            )}

            <PrLinks
              links={ticket.prLinks}
              disabled={archived}
              onSave={(prLinks) => patch("prLinks", { prLinks })}
            />

            {ticket.source === "hub" && (
              <TicketThread ticketId={ticket.id} messages={messages} clientEmail={ticket.createdByEmail} disabled={archived} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</h2>;
}

/** Odkazy na pull requesty: přidání vložením adresy (Enter), odebrání křížkem. Ukládá se hned. */
function PrLinks({
  links,
  disabled,
  onSave,
}: {
  links: string[];
  disabled: boolean;
  onSave: (links: string[]) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(next: string[]) {
    setBusy(true);
    const ok = await onSave(next);
    setBusy(false);
    return ok;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const url = normalizeUrl(draft);
    if (!url) return;
    try {
      new URL(url);
    } catch {
      toast.error("Neplatný odkaz");
      return;
    }
    if (links.includes(url)) {
      setDraft("");
      return;
    }
    if (await save([...links, url])) setDraft("");
  }

  if (disabled && links.length === 0) return null;

  return (
    <section>
      <SectionTitle>Pull requesty</SectionTitle>
      {links.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {links.map((link) => (
            <li key={link} className="group flex items-center gap-2 rounded-lg border px-2.5 py-1.5">
              <GitPullRequest className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                title={link}
                className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
              >
                {prLabel(link)}
              </a>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={busy}
                  onClick={() => save(links.filter((l) => l !== link))}
                  aria-label="Odebrat PR"
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <form onSubmit={add} className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://github.com/solopixel-cz/…/pull/123"
            className="flex-1"
          />
          <Button type="submit" variant="outline" size="sm" disabled={busy || !draft.trim()} className="h-9 shrink-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="max-sm:sr-only">Přidat</span>
          </Button>
        </form>
      )}
    </section>
  );
}
