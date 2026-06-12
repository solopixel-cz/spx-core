"use client";

import { useState } from "react";
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
import { Plus } from "lucide-react";
import { ClientFormDialog } from "./client-form-dialog";

interface ClientRow {
  id: string;
  name: string;
  company?: string;
  email: string;
  status: string;
  advisorSlug: string;
  instanceCount: number;
  updatedAt: string | null;
}

const statusLabels: Record<string, string> = {
  onboarding: "Onboarding",
  active: "Aktivní",
  paused: "Pozastavený",
  churned: "Odešlý",
};

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  onboarding: "outline",
  active: "default",
  paused: "secondary",
  churned: "destructive",
};

const columnHelper = createColumnHelper<ClientRow>();

const columns = [
  columnHelper.accessor("name", {
    header: "Jméno",
    cell: (info) => (
      <Link
        href={`/klienti/${info.row.original.id}`}
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
  columnHelper.accessor("advisorSlug", {
    header: "Slug",
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

export function ClientsPageClient({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const table = useReactTable({
    data: clients,
    columns,
    state: { globalFilter, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Klienti</h1>
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
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Hledat..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={
            (columnFilters.find((f) => f.id === "status")?.value as string) ??
            "all"
          }
          onValueChange={(val) =>
            setColumnFilters(
              val === "all" ? [] : [{ id: "status", value: val }]
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
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground"
                >
                  Žádní klienti
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
