"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import {
  EntityCard,
  EntityCardEmpty,
  EntityCardList,
} from "@/components/entity-card";
import { FilterBar } from "@/components/filter-bar";
import { ArchiveNotice, ArchiveToggle } from "@/components/archive-toggle";
import { formatDate } from "@/lib/format";
import {
  BulkArchiveBar,
  RowCheckbox,
  SelectAllCheckbox,
} from "@/components/bulk-archive-bar";
import { useRowSelection } from "@/lib/hooks/use-row-selection";
import {
  ticketTypeLabels as typeLabels,
  ticketPriorityLabels as priorityLabels,
  ticketStatusLabels as statusLabels,
  ticketPriorityVariants as priorityVariants,
} from "@/lib/ticket-labels";

interface TicketRow {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigneeUid?: string;
  links: string[];
  createdAt: string | null;
  deletedAt?: string | null;
}

interface ClientOption { id: string; name: string }

export function TicketsPageClient({
  tickets,
  clients,
  canArchive = false,
  archived = false,
}: {
  tickets: TicketRow[];
  clients: ClientOption[];
  canArchive?: boolean;
  /** Tabulka archivovaných ticketů (`?archived=1`). */
  archived?: boolean;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [now] = useState(() => Date.now());

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (clientFilter !== "all" && t.clientId !== clientFilter) return false;
    return true;
  });
  const visibleIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const selection = useRowSelection(visibleIds, archived ? "tickets:archive" : "tickets");

  const openTicket = (id: string) => router.push(`/tickets/${id}`);

  function getTimeSince(dateStr: string | null): string {
    if (!dateStr) return "";
    const days = Math.floor((now - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "dnes";
    if (days === 1) return "1 den";
    return `${days} dní`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{archived ? "Archiv ticketů" : "Tickety"}</h1>
        <div className="flex items-center gap-2">
          {canArchive && <ArchiveToggle archived={archived} />}
          {!archived && (
            <Button size="sm" nativeButton={false} render={<Link href="/tickets/new" />}>
              <Plus className="mr-2 h-4 w-4" />
              Nový ticket
            </Button>
          )}
        </div>
      </div>

      {archived && <ArchiveNotice count={tickets.length} />}

      <FilterBar>
        <Select items={{ all: "Všechny stavy", ...statusLabels }} value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "all")}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={{ all: "Všechny typy", ...typeLabels }} value={typeFilter} onValueChange={(val) => setTypeFilter(val ?? "all")}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny typy</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={{ all: "Všechny priority", ...priorityLabels }} value={priorityFilter} onValueChange={(val) => setPriorityFilter(val ?? "all")}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny priority</SelectItem>
            {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          items={{
            all: "Všichni klienti",
            ...Object.fromEntries(clients.map((c) => [c.id, c.name])),
          }}
          value={clientFilter}
          onValueChange={(val) => setClientFilter(val ?? "all")}
        >
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všichni klienti</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Mobil: karty */}
      <EntityCardList>
        {filtered.length === 0 ? (
          <EntityCardEmpty>{archived ? "Archiv je prázdný" : "Žádné tickety"}</EntityCardEmpty>
        ) : (
          filtered.map((t) => (
            <EntityCard
              key={t.id}
              onClick={selection.active ? () => selection.toggle(t.id) : () => openTicket(t.id)}
              leading={canArchive ? <RowCheckbox selection={selection} id={t.id} /> : undefined}
              title={t.title}
              badge={
                <Badge variant={priorityVariants[t.priority] ?? "secondary"}>
                  {priorityLabels[t.priority] ?? t.priority}
                </Badge>
              }
              subtitle={t.clientName}
              meta={
                <>
                  <span>{typeLabels[t.type] ?? t.type}</span>
                  <span>{statusLabels[t.status] ?? t.status}</span>
                  {t.createdAt && <span>{getTimeSince(t.createdAt)}</span>}
                </>
              }
            />
          ))
        )}
      </EntityCardList>

      {/* Desktop: tabulka */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {canArchive && (
                <TableHead className="w-12">
                  <SelectAllCheckbox selection={selection} />
                </TableHead>
              )}
              <TableHead>Typ</TableHead>
              <TableHead>Titul</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Priorita</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead>{archived ? "Archivováno" : "Stáří"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={canArchive ? 7 : 6} className="text-center text-muted-foreground">Žádné tickety</TableCell></TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow
                  key={t.id}
                  onRowClick={selection.active ? () => selection.toggle(t.id) : () => openTicket(t.id)}
                  data-state={selection.isSelected(t.id) ? "selected" : undefined}
                >
                  {canArchive && (
                    <TableCell>
                      <RowCheckbox selection={selection} id={t.id} />
                    </TableCell>
                  )}
                  <TableCell><Badge variant="outline">{typeLabels[t.type] ?? t.type}</Badge></TableCell>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{t.clientName}</TableCell>
                  <TableCell><Badge variant={priorityVariants[t.priority] ?? "secondary"}>{priorityLabels[t.priority] ?? t.priority}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{statusLabels[t.status] ?? t.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{archived ? formatDate(t.deletedAt ?? null) : getTimeSince(t.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {canArchive && (
        <BulkArchiveBar
          collection="tickets"
          selection={selection}
          noun={["ticket", "tickety", "ticketů"]}
          mode={archived ? "restore" : "archive"}
        />
      )}
    </div>
  );
}
