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
import { LayoutList, Plus, SquareKanban, X } from "lucide-react";
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
  TICKET_STATUSES,
  ticketColumn,
} from "@/lib/ticket-labels";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BacklogBoard } from "@/components/tickets/backlog-board";
import { SortableHead } from "@/components/sortable-head";
import { useTableSort } from "@/lib/use-table-sort";
import { usePersistentFilters } from "@/lib/hooks/use-persistent-filters";

interface TicketRow {
  id: string;
  /** null = interní ticket. */
  clientId: string | null;
  clientName: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigneeUid?: string;
  links: string[];
  prCount: number;
  /** Zpětná vazba od klienta z HUBu. */
  fromHub?: boolean;
  /** Klient napsal a tým ticket ještě neotevřel. */
  unread?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt?: string | null;
}

function SourceBadges({ t }: { t: TicketRow }) {
  if (!t.fromHub) return null;
  return (
    <>
      {t.unread && <Badge className="mr-1.5">Nové</Badge>}
      <Badge variant="secondary" className="mr-1.5">HUB</Badge>
    </>
  );
}

interface ClientOption { id: string; name: string }
interface UserOption { id: string; name: string }

const SOURCE_LABELS: Record<string, string> = { all: "Odkudkoli", hub: "Z HUBu", crm: "Z CRM" };
const INTERNAL = "__internal__";
const UNASSIGNED = "__none__";

/** Filtry Backlogu: klíč = název parametru v URL, hodnota = „nefiltrováno". */
const FILTER_DEFAULTS = {
  assignee: "all",
  status: "all",
  type: "all",
  priority: "all",
  client: "all",
  source: "all",
} as const;

/** Pro hlášku o zahozeném filtru (2. pád). */
const FILTER_NOUNS: Record<keyof typeof FILTER_DEFAULTS, string> = {
  assignee: "řešitele",
  status: "stavu",
  type: "typu",
  priority: "priority",
  client: "klienta",
  source: "zdroje",
};

// Priorita a stav se řadí podle pořadí (nízká → urgentní, otevřený → uzavřený), neznámé na konec.
const priorityOrder = Object.keys(priorityLabels);
function rank(order: string[], value: string): number | null {
  const i = order.indexOf(value);
  return i === -1 ? null : i;
}

/** Backlog (`/backlog`): nástěnka po stavech, nebo tabulka (`?view=list`, archiv vždy jako tabulka). */
export function TicketsPageClient({
  tickets,
  clients,
  users,
  currentUid,
  showInternal = false,
  view = "board",
  canArchive = false,
  archived = false,
}: {
  tickets: TicketRow[];
  clients: ClientOption[];
  users: UserOption[];
  currentUid: string;
  /** Filtr „Interní“ (obchodník interní tickety nevidí). */
  showInternal?: boolean;
  view?: "board" | "list";
  canArchive?: boolean;
  /** Tabulka archivovaných ticketů (`?archived=1`). */
  archived?: boolean;
}) {
  const router = useRouter();
  const [now] = useState(() => Date.now());

  const userNames = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name])), [users]);
  const assigneeItems: Record<string, string> = {
    all: "Všichni",
    [currentUid]: "Já",
    ...Object.fromEntries(users.filter((u) => u.id !== currentUid).map((u) => [u.id, u.name])),
    [UNASSIGNED]: "Nepřiřazeno",
  };
  const clientItems: Record<string, string> = {
    all: "Všichni klienti",
    ...(showInternal ? { [INTERNAL]: "Interní" } : {}),
    ...Object.fromEntries(clients.map((c) => [c.id, c.name])),
  };

  // Zvolené filtry přežijí refresh — v URL (odkaz na vyfiltrovaný seznam)
  // i v localStorage pro daného uživatele (výchozí stav bez parametrů v URL).
  // Hodnoty mimo aktuální nabídku (smazaný klient, deaktivovaný řešitel,
  // „Interní" u obchodníka) hook zahodí a vrátí v `dropped`.
  const filters = usePersistentFilters({
    storageKey: `backlog:${archived ? "archive" : "board"}:${currentUid}`,
    defaults: FILTER_DEFAULTS,
    validate: {
      assignee: (v) => v in assigneeItems,
      status: (v) => TICKET_STATUSES.includes(v),
      type: (v) => v in typeLabels,
      priority: (v) => v in priorityLabels,
      client: (v) => v in clientItems,
      source: (v) => v in SOURCE_LABELS,
    },
  });
  const {
    assignee: assigneeFilter,
    status: statusFilter,
    type: typeFilter,
    priority: priorityFilter,
    client: clientFilter,
    source: sourceFilter,
  } = filters.values;
  // „Zrušit filtry" jen podle filtrů, které jsou vidět — stav se na nástěnce
  // nenabízí (sloupce ho zastupují), tak se do počtu nezapočítá.
  const hasActiveFilters = (Object.keys(FILTER_DEFAULTS) as (keyof typeof FILTER_DEFAULTS)[]).some(
    (name) =>
      filters.values[name] !== FILTER_DEFAULTS[name] && (name !== "status" || view === "list"),
  );

  const filtered = tickets.filter((t) => {
    if (view === "list" && statusFilter !== "all" && ticketColumn(t.status) !== statusFilter) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (clientFilter === INTERNAL && t.clientId) return false;
    if (clientFilter !== "all" && clientFilter !== INTERNAL && t.clientId !== clientFilter) return false;
    if (assigneeFilter === UNASSIGNED && t.assigneeUid) return false;
    if (assigneeFilter !== "all" && assigneeFilter !== UNASSIGNED && t.assigneeUid !== assigneeFilter) return false;
    if (sourceFilter === "hub" && !t.fromHub) return false;
    if (sourceFilter === "crm" && t.fromHub) return false;
    return true;
  });
  // Řazení po filtrech; výchozí abecedně podle klienta.
  const { sorted, sort, toggle } = useTableSort<TicketRow, "type" | "title" | "client" | "priority" | "status" | "age" | "archivedAt">(
    filtered,
    {
      type: (t) => typeLabels[t.type] ?? t.type,
      title: (t) => t.title,
      client: (t) => t.clientName,
      priority: (t) => rank(priorityOrder, t.priority),
      status: (t) => rank(TICKET_STATUSES, ticketColumn(t.status)),
      // Stáří: vzestupně = nejmladší první.
      age: (t) => (t.createdAt ? -new Date(t.createdAt).getTime() : null),
      archivedAt: (t) => (t.deletedAt ? new Date(t.deletedAt) : null),
    },
    { key: "client", dir: "asc" },
  );
  const visibleIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const selection = useRowSelection(visibleIds, archived ? "tickets:archive" : "tickets");

  const openTicket = (id: string) => router.push(`/backlog/${id}`);
  // Přepnutí nástěnka/seznam nesmí zahodit zvolené filtry z URL.
  const setView = (next: string) => {
    const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    if (next === "list") params.set("view", "list");
    else params.delete("view");
    const qs = params.toString();
    router.replace(qs ? `/backlog?${qs}` : "/backlog", { scroll: false });
  };

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
        <h1 className="text-2xl font-bold tracking-tight">{archived ? "Archiv ticketů" : "Backlog"}</h1>
        <div className="flex items-center gap-2">
          {!archived && (
            <Tabs value={view} onValueChange={(v) => setView(String(v))}>
              <TabsList className="max-sm:w-auto">
                <TabsTrigger value="board" aria-label="Nástěnka">
                  <SquareKanban />
                  <span className="max-sm:hidden">Nástěnka</span>
                </TabsTrigger>
                <TabsTrigger value="list" aria-label="Seznam">
                  <LayoutList />
                  <span className="max-sm:hidden">Seznam</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {canArchive && <ArchiveToggle archived={archived} />}
          {!archived && (
            <Button size="sm" nativeButton={false} render={<Link href="/backlog/new" />}>
              <Plus className="mr-2 h-4 w-4" />
              Nový ticket
            </Button>
          )}
        </div>
      </div>

      {archived && <ArchiveNotice count={tickets.length} />}

      <FilterBar>
        <Select items={assigneeItems} value={assigneeFilter} onValueChange={(val) => filters.set("assignee", val)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(assigneeItems).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        {view === "list" && (
          <Select items={{ all: "Všechny stavy", ...statusLabels }} value={statusFilter} onValueChange={(val) => filters.set("status", val)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny stavy</SelectItem>
              {TICKET_STATUSES.map((k) => <SelectItem key={k} value={k}>{statusLabels[k]}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select items={{ all: "Všechny typy", ...typeLabels }} value={typeFilter} onValueChange={(val) => filters.set("type", val)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny typy</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={{ all: "Všechny priority", ...priorityLabels }} value={priorityFilter} onValueChange={(val) => filters.set("priority", val)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny priority</SelectItem>
            {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={clientItems} value={clientFilter} onValueChange={(val) => filters.set("client", val)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(clientItems).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={SOURCE_LABELS} value={sourceFilter} onValueChange={(val) => filters.set("source", val)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={filters.reset}>
            <X className="mr-1 h-4 w-4" />
            Zrušit filtry
          </Button>
        )}
      </FilterBar>

      {filters.dropped.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Zapamatovaný filtr {filters.dropped.map((k) => FILTER_NOUNS[k]).join(" a ")} už neplatí
          (záznam byl smazán nebo k němu nemáte přístup) — zobrazuje se vše.
        </p>
      )}

      {view === "board" ? (
        <BacklogBoard tickets={filtered} userNames={userNames} />
      ) : (
      <>
      {/* Mobil: karty */}
      <EntityCardList>
        {filtered.length === 0 ? (
          <EntityCardEmpty>{archived ? "Archiv je prázdný" : "Žádné tickety"}</EntityCardEmpty>
        ) : (
          sorted.map((t) => (
            <EntityCard
              key={t.id}
              onClick={selection.active ? () => selection.toggle(t.id) : () => openTicket(t.id)}
              leading={canArchive ? <RowCheckbox selection={selection} id={t.id} /> : undefined}
              title={<><SourceBadges t={t} />{t.title}</>}
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
              <SortableHead sortKey="type" sort={sort} onSort={toggle}>Typ</SortableHead>
              <SortableHead sortKey="title" sort={sort} onSort={toggle}>Titul</SortableHead>
              <SortableHead sortKey="client" sort={sort} onSort={toggle}>Klient</SortableHead>
              <SortableHead sortKey="priority" sort={sort} onSort={toggle}>Priorita</SortableHead>
              <SortableHead sortKey="status" sort={sort} onSort={toggle}>Stav</SortableHead>
              <SortableHead sortKey={archived ? "archivedAt" : "age"} sort={sort} onSort={toggle}>
                {archived ? "Archivováno" : "Stáří"}
              </SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={canArchive ? 7 : 6} className="text-center text-muted-foreground">Žádné tickety</TableCell></TableRow>
            ) : (
              sorted.map((t) => (
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
                  <TableCell className="font-medium"><SourceBadges t={t} />{t.title}</TableCell>
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
      </>
      )}

      {canArchive && view === "list" && (
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
