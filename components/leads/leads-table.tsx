"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
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
import {
  EntityCard,
  EntityCardEmpty,
  EntityCardList,
} from "@/components/entity-card";
import { FilterBar } from "@/components/filter-bar";
import {
  BulkArchiveBar,
  RowCheckbox,
  SelectAllCheckbox,
} from "@/components/bulk-archive-bar";
import { useRowSelection } from "@/lib/hooks/use-row-selection";
import {
  stageLabels,
  sourceLabels,
  type LeadRow,
  type UserOption,
} from "./leads-page-client";

const stageVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "outline",
  contacted: "outline",
  demo: "secondary",
  offer: "secondary",
  contract: "default",
  onboarding: "default",
  won: "default",
  lost: "destructive",
};

const columnHelper = createColumnHelper<LeadRow>();

export function LeadsTable({
  leads,
  users,
  onLeadClick,
  canArchive = false,
  onRowsRemoved,
  archived = false,
}: {
  leads: LeadRow[];
  users: UserOption[];
  /** Bez handleru (archiv) řádky detail neotevírají. */
  onLeadClick?: (lead: LeadRow) => void;
  canArchive?: boolean;
  onRowsRemoved?: (ids: string[]) => void;
  archived?: boolean;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const dataColumns = [
    columnHelper.accessor("name", {
      header: "Jméno",
      cell: (info) =>
        onLeadClick ? (
          <button
            onClick={() => onLeadClick(info.row.original)}
            className="font-medium hover:underline text-left"
          >
            {info.getValue()}
          </button>
        ) : (
          <span className="font-medium">{info.getValue()}</span>
        ),
    }),
    columnHelper.accessor("company", {
      header: "Firma",
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("stage", {
      header: "Fáze",
      cell: (info) => (
        <Badge variant={stageVariants[info.getValue()] ?? "secondary"}>
          {stageLabels[info.getValue()] ?? info.getValue()}
        </Badge>
      ),
      filterFn: (row, _col, val) => !val || val === "all" || row.original.stage === val,
    }),
    columnHelper.accessor("source", {
      header: "Zdroj",
      cell: (info) => (
        <Badge variant="outline">
          {sourceLabels[info.getValue()] ?? info.getValue()}
        </Badge>
      ),
      filterFn: (row, _col, val) => !val || val === "all" || row.original.source === val,
    }),
    columnHelper.accessor("value", {
      header: "Hodnota",
      cell: (info) => {
        const v = info.getValue();
        return v ? `${v.toLocaleString("cs-CZ")} Kč` : "—";
      },
    }),
    columnHelper.accessor("ownerUid", {
      header: "Vlastník",
      cell: (info) => {
        const owner = users.find((u) => u.id === info.getValue());
        return owner?.displayName ?? "—";
      },
      filterFn: (row, _col, val) => !val || val === "all" || row.original.ownerUid === val,
    }),
    ...(archived
      ? [
          columnHelper.accessor("deletedAt", {
            header: "Archivováno",
            cell: (info) => {
              const val = info.getValue();
              return val ? new Date(val).toLocaleDateString("cs-CZ") : "—";
            },
          }),
        ]
      : []),
    columnHelper.accessor("updatedAt", {
      header: "Aktualizováno",
      cell: (info) => {
        const val = info.getValue();
        return val ? new Date(val).toLocaleDateString("cs-CZ") : "—";
      },
    }),
  ];

  const columns = canArchive
    ? [
        columnHelper.display({
          id: "select",
          header: () => <SelectAllCheckbox selection={selection} />,
          cell: (info) => <RowCheckbox selection={selection} id={info.row.original.id} />,
        }),
        ...dataColumns,
      ]
    : dataColumns;

  const table = useReactTable({
    data: leads,
    columns,
    state: { globalFilter, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;
  const visibleIds = useMemo(() => rows.map((r) => r.original.id), [rows]);
  const selection = useRowSelection(visibleIds, archived ? "leads:archive" : "leads");

  return (
    <div className="space-y-4">
      <FilterBar>
        <Input
          placeholder="Hledat..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="min-w-40 flex-1 sm:max-w-sm"
        />
        <Select
          items={{ all: "Všechny fáze", ...stageLabels }}
          value={(columnFilters.find((f) => f.id === "stage")?.value as string) ?? "all"}
          onValueChange={(val) =>
            setColumnFilters((prev) => {
              const without = prev.filter((f) => f.id !== "stage");
              return val === "all" ? without : [...without, { id: "stage", value: val }];
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Fáze" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny fáze</SelectItem>
            {Object.entries(stageLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={{ all: "Všechny zdroje", ...sourceLabels }}
          value={(columnFilters.find((f) => f.id === "source")?.value as string) ?? "all"}
          onValueChange={(val) =>
            setColumnFilters((prev) => {
              const without = prev.filter((f) => f.id !== "source");
              return val === "all" ? without : [...without, { id: "source", value: val }];
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Zdroj" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny zdroje</SelectItem>
            {Object.entries(sourceLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Mobil: karty */}
      <EntityCardList>
        {rows.length === 0 ? (
          <EntityCardEmpty>{archived ? "Archiv je prázdný" : "Žádné leady"}</EntityCardEmpty>
        ) : (
          rows.map((row) => {
            const lead = row.original;
            const owner = users.find((u) => u.id === lead.ownerUid);
            return (
              <EntityCard
                key={lead.id}
                onClick={onLeadClick ? () => onLeadClick(lead) : undefined}
                leading={canArchive ? <RowCheckbox selection={selection} id={lead.id} /> : undefined}
                title={lead.name}
                badge={
                  <Badge variant={stageVariants[lead.stage] ?? "secondary"}>
                    {stageLabels[lead.stage] ?? lead.stage}
                  </Badge>
                }
                subtitle={lead.company || undefined}
                meta={
                  <>
                    <span>{sourceLabels[lead.source] ?? lead.source}</span>
                    {lead.value ? (
                      <span className="font-medium text-foreground">
                        {lead.value.toLocaleString("cs-CZ")} Kč
                      </span>
                    ) : null}
                    {owner && <span>{owner.displayName}</span>}
                    {lead.updatedAt && (
                      <span>
                        {new Date(lead.updatedAt).toLocaleDateString("cs-CZ")}
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
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className={h.id === "select" ? "w-12" : undefined}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  Žádné leady
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  onRowClick={onLeadClick ? () => onLeadClick(row.original) : undefined}
                  data-state={selection.isSelected(row.original.id) ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
          collection="leads"
          selection={selection}
          noun={["lead", "leady", "leadů"]}
          mode={archived ? "restore" : "archive"}
          onDone={onRowsRemoved}
        />
      )}
    </div>
  );
}
