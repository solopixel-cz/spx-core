"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnFiltersState,
} from "@tanstack/react-table";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import {
  EntityCard,
  EntityCardEmpty,
  EntityCardList,
} from "@/components/entity-card";
import { FilterBar } from "@/components/filter-bar";
import { ArchiveNotice, ArchiveToggle } from "@/components/archive-toggle";
import {
  BulkArchiveBar,
  RowCheckbox,
  SelectAllCheckbox,
} from "@/components/bulk-archive-bar";
import { useRowSelection } from "@/lib/hooks/use-row-selection";
import { formatCurrency } from "@/lib/format";
import { ClientFormDialog } from "./client-form-dialog";

export interface ClientRow {
  id: string;
  name: string;
  company?: string;
  email: string;
  status: string;
  instanceCount: number;
  updatedAt: string | null;
  deletedAt: string | null;
  /** paying = nezrušené a ne interní předplatné; internal = interní vizitka; none = bez předplatného */
  billing: "paying" | "internal" | "none";
  planLabel: string | null;
  priceMonthly: number | null;
}

type Segment = "paying" | "other" | "all";

const statusLabels: Record<string, string> = {
  onboarding: "Onboarding",
  active: "Aktivní",
  paused: "Pozastavený",
  churned: "Odešlý",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  onboarding: "outline",
  active: "default",
  paused: "secondary",
  churned: "destructive",
};

// Pořadí v seznamu: platící → interní → bez předplatného; uvnitř aktivní první.
const billingRank: Record<ClientRow["billing"], number> = {
  paying: 0,
  internal: 1,
  none: 2,
};
const statusRank: Record<string, number> = {
  active: 0,
  onboarding: 1,
  paused: 2,
  churned: 3,
};

function BillingCell({ client }: { client: ClientRow }) {
  if (client.billing === "internal")
    return <Badge variant="secondary">Interní</Badge>;
  if (client.billing === "none")
    return <span className="text-muted-foreground">—</span>;
  return (
    <span>
      {client.planLabel}
      {client.priceMonthly != null && (
        <span className="text-muted-foreground">
          {" "}
          · {formatCurrency(client.priceMonthly)}/měs
        </span>
      )}
    </span>
  );
}

const columnHelper = createColumnHelper<ClientRow>();

const dataColumns = [
  columnHelper.accessor("name", {
    header: "Jméno",
    cell: (info) => (
      <Link
        href={`/clients/${info.row.original.id}`}
        className="font-medium hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("company", {
    header: "Firma",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("email", {
    header: "E-mail",
  }),
  columnHelper.accessor("status", {
    header: "Stav",
    cell: (info) => (
      <Badge variant={statusVariants[info.getValue()] ?? "secondary"}>
        {statusLabels[info.getValue()] ?? info.getValue()}
      </Badge>
    ),
    filterFn: (row, _columnId, filterValue) => {
      if (!filterValue || filterValue === "all") return true;
      return row.original.status === filterValue;
    },
  }),
  columnHelper.accessor("billing", {
    header: "Paušál",
    cell: (info) => <BillingCell client={info.row.original} />,
    enableGlobalFilter: false,
  }),
  columnHelper.accessor("instanceCount", {
    header: "Instance",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("updatedAt", {
    header: "Poslední aktivita",
    cell: (info) => {
      const val = info.getValue();
      if (!val) return "—";
      return new Date(val).toLocaleDateString("cs-CZ");
    },
  }),
];

const archivedAtColumn = columnHelper.accessor("deletedAt", {
  header: "Archivováno",
  cell: (info) => {
    const val = info.getValue();
    return val ? new Date(val).toLocaleDateString("cs-CZ") : "—";
  },
  enableGlobalFilter: false,
});

const FILTER_STORAGE_KEY = "clients:filters";

export function ClientsPageClient({
  clients: initialClients,
  canArchive,
  archived = false,
}: {
  clients: ClientRow[];
  canArchive: boolean;
  /** Tabulka archivovaných klientů (`?archived=1`). */
  archived?: boolean;
}) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [segment, setSegment] = useState<Segment>("paying");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Resync ze serveru po router.refresh — úprava stavu během renderu.
  const [prevInitialClients, setPrevInitialClients] = useState(initialClients);
  if (prevInitialClients !== initialClients) {
    setPrevInitialClients(initialClients);
    setClients(initialClients);
  }

  // Obnov filtry z minulé návštěvy (přežije návrat z detailu klienta).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FILTER_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          q?: string;
          status?: string;
          segment?: Segment;
        };
        if (saved.q) setGlobalFilter(saved.q);
        if (saved.status && saved.status !== "all") {
          setColumnFilters([{ id: "status", value: saved.status }]);
        }
        if (saved.segment) setSegment(saved.segment);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Ulož filtry při každé změně (až po prvotním obnovení).
  useEffect(() => {
    if (!hydrated) return;
    try {
      const status =
        (columnFilters.find((f) => f.id === "status")?.value as string) ??
        "all";
      sessionStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({ q: globalFilter, status, segment }),
      );
    } catch {
      // ignore
    }
  }, [globalFilter, columnFilters, segment, hydrated]);

  const sorted = useMemo(
    () =>
      archived
        ? clients // server řadí podle data archivace
        : [...clients].sort(
            (a, b) =>
              billingRank[a.billing] - billingRank[b.billing] ||
              (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9),
          ),
    [clients, archived],
  );

  const payingCount = sorted.filter((c) => c.billing === "paying").length;
  const segmentData = useMemo(
    () =>
      archived || segment === "all"
        ? sorted
        : sorted.filter(
            (c) => (c.billing === "paying") === (segment === "paying"),
          ),
    [sorted, segment, archived],
  );

  const baseColumns = archived
    ? [...dataColumns, archivedAtColumn]
    : dataColumns;
  const columns = canArchive
    ? [
        columnHelper.display({
          id: "select",
          header: () => <SelectAllCheckbox selection={selection} />,
          cell: (info) => (
            <RowCheckbox selection={selection} id={info.row.original.id} />
          ),
        }),
        ...baseColumns,
      ]
    : baseColumns;

  const table = useReactTable({
    data: segmentData,
    columns,
    state: { globalFilter, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;
  const visibleIds = useMemo(() => rows.map((r) => r.original.id), [rows]);
  const selection = useRowSelection(visibleIds, archived ? "clients:archive" : "clients");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {archived ? "Archiv klientů" : "Klienti"}
        </h1>
        <div className="flex items-center gap-2">
          {canArchive && <ArchiveToggle archived={archived} />}
          {!archived && (
            <ClientFormDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onSuccess={() => {
                setDialogOpen(false);
                router.refresh();
              }}
              trigger={
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nový klient
                </Button>
              }
            />
          )}
        </div>
      </div>

      {archived && <ArchiveNotice count={clients.length} />}

      {!archived && (
        <Tabs value={segment} onValueChange={(v) => setSegment(v as Segment)}>
          <TabsList>
            <TabsTrigger value="paying">Platící ({payingCount})</TabsTrigger>
            <TabsTrigger value="other">
              Neplatící ({sorted.length - payingCount})
            </TabsTrigger>
            <TabsTrigger value="all">Všichni ({sorted.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <FilterBar>
        <Input
          placeholder="Hledat..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="min-w-40 flex-1 sm:max-w-sm"
        />
        <Select
          items={{ all: "Všechny stavy", ...statusLabels }}
          value={
            (columnFilters.find((f) => f.id === "status")?.value as string) ??
            "all"
          }
          onValueChange={(val) =>
            setColumnFilters(
              val === "all" ? [] : [{ id: "status", value: val }],
            )
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="active">Aktivní</SelectItem>
            <SelectItem value="paused">Pozastavený</SelectItem>
            <SelectItem value="churned">Odešlý</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Mobil: karty */}
      <EntityCardList>
        {rows.length === 0 ? (
          <EntityCardEmpty>
            {archived ? "Archiv je prázdný" : "Žádní klienti"}
          </EntityCardEmpty>
        ) : (
          rows.map((row) => {
            const c = row.original;
            return (
              <EntityCard
                key={c.id}
                href={`/clients/${c.id}`}
                leading={
                  canArchive ? (
                    <RowCheckbox selection={selection} id={c.id} />
                  ) : undefined
                }
                title={c.name}
                badge={
                  <Badge variant={statusVariants[c.status] ?? "secondary"}>
                    {statusLabels[c.status] ?? c.status}
                  </Badge>
                }
                subtitle={[c.company, c.email].filter(Boolean).join(" · ")}
                meta={
                  <>
                    {c.billing !== "none" && <BillingCell client={c} />}
                    <span>
                      {c.instanceCount}{" "}
                      {c.instanceCount === 1 ? "instance" : "instancí"}
                    </span>
                    {c.updatedAt && (
                      <span>
                        {new Date(c.updatedAt).toLocaleDateString("cs-CZ")}
                      </span>
                    )}
                  </>
                }
              />
            );
          })
        )}
      </EntityCardList>

      {/* Desktop: tabulka */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.id === "select" ? "w-12" : undefined}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground"
                >
                  Žádní klienti
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  href={`/clients/${row.original.id}`}
                  data-state={
                    selection.isSelected(row.original.id)
                      ? "selected"
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {canArchive && (
        <BulkArchiveBar
          collection="clients"
          selection={selection}
          noun={["klienta", "klienty", "klientů"]}
          mode={archived ? "restore" : "archive"}
          warning="Archivuje i instance, otevřené tickety a zruší předplatné."
          restoreNote="Předplatné a instance se neobnovují, zkontrolujte je v detailu klienta."
          undoable={false}
          onDone={(ids) =>
            setClients((prev) => prev.filter((c) => !ids.includes(c.id)))
          }
        />
      )}
    </div>
  );
}
