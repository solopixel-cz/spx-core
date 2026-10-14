"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Download } from "lucide-react";
import {
  EntityCard,
  EntityCardEmpty,
  EntityCardList,
} from "@/components/entity-card";
import { SortableHead } from "@/components/sortable-head";
import { useTableSort } from "@/lib/use-table-sort";
import {
  InvoiceActions,
  InvoiceDueCell,
  InvoiceStatusCell,
  formatAmount,
  formatInvoiceDate,
  invoiceStatusLabels,
  overdueRowClass,
} from "@/components/invoices/invoice-ui";

interface InvoiceRow {
  id: string;
  clientId: string;
  clientName: string;
  number: string;
  amount: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  status: string;
  emailStatus: string | null;
}

// Filtr jako záložky s počty. „Otevřené" = odeslané i po splatnosti.
const FILTERS = [
  { key: "all", label: "Vše", match: () => true },
  { key: "open", label: "Otevřené", match: (s: string) => s === "sent" || s === "overdue" },
  { key: "overdue", label: "Po splatnosti", match: (s: string) => s === "overdue" },
  { key: "paid", label: "Zaplacené", match: (s: string) => s === "paid" },
  { key: "draft", label: "Koncepty", match: (s: string) => s === "draft" },
  { key: "cancelled", label: "Storno", match: (s: string) => s === "cancelled" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

// Stav řadíme podle životního cyklu (pořadí v invoiceStatusLabels), neznámé na konec.
const statusOrder = Object.keys(invoiceStatusLabels);
function statusRank(status: string): number | null {
  const i = statusOrder.indexOf(status);
  return i === -1 ? null : i;
}

export function InvoicesPageClient({
  invoices,
  stats,
}: {
  invoices: InvoiceRow[];
  stats: {
    overdueCount: number;
    overdueSum: number;
    issuedThisMonthSum: number;
    paidThisMonthSum: number;
  };
}) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.key, invoices.filter((i) => f.match(i.status)).length]),
  ) as Record<FilterKey, number>;
  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const filtered = useMemo(() => invoices.filter((i) => activeFilter.match(i.status)), [invoices, activeFilter]);
  // Řazení po filtru; výchozí od posledně vystavené faktury.
  const { sorted, sort, toggle } = useTableSort<InvoiceRow, "client" | "amount" | "issued" | "due" | "status">(
    filtered,
    {
      client: (i) => i.clientName,
      amount: (i) => i.amount,
      issued: (i) => (i.issuedAt ? new Date(i.issuedAt) : null),
      due: (i) => (i.dueAt ? new Date(i.dueAt) : null),
      status: (i) => statusRank(i.status),
    },
    { key: "issued", dir: "desc" },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Fakturace</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/invoices/export" />}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/invoices/new" />}>
            <Plus className="mr-2 h-4 w-4" />
            Nová faktura
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Po splatnosti</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {stats.overdueCount}
            </p>
            <p className="text-sm text-muted-foreground">
              {stats.overdueSum.toLocaleString("cs-CZ")} Kč
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vystaveno tento měsíc</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.issuedThisMonthSum.toLocaleString("cs-CZ")} Kč
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Zaplaceno tento měsíc</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {stats.paidThisMonthSum.toLocaleString("cs-CZ")} Kč
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtr */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.key} value={f.key}>
              {f.label} <span className="ml-1 tabular-nums opacity-60">{counts[f.key]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Mobil: karty */}
      <EntityCardList>
        {filtered.length === 0 ? (
          <EntityCardEmpty>Žádné faktury</EntityCardEmpty>
        ) : (
          sorted.map((inv) => (
            <EntityCard
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className={inv.status === "overdue" ? "border-l-4 border-l-destructive" : undefined}
              title={inv.clientName}
              badge={<span className="font-semibold tabular-nums">{formatAmount(inv.amount)}</span>}
              subtitle={<span className="font-mono text-xs">{inv.number}</span>}
            >
              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="space-y-2 text-sm">
                  <InvoiceStatusCell status={inv.status} emailStatus={inv.emailStatus} />
                  <InvoiceDueCell dueAt={inv.dueAt} status={inv.status} />
                </div>
                <InvoiceActions invoice={inv} className="relative z-10" />
              </div>
            </EntityCard>
          ))
        )}
      </EntityCardList>

      {/* Desktop: tabulka */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead sortKey="client" sort={sort} onSort={toggle}>Klient / číslo</SortableHead>
              <SortableHead sortKey="amount" sort={sort} onSort={toggle} className="text-right">Částka</SortableHead>
              <SortableHead sortKey="issued" sort={sort} onSort={toggle}>Vystaveno</SortableHead>
              <SortableHead sortKey="due" sort={sort} onSort={toggle}>Splatnost</SortableHead>
              <SortableHead sortKey="status" sort={sort} onSort={toggle}>Stav</SortableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">Žádné faktury</TableCell>
              </TableRow>
            ) : (
              sorted.map((inv) => (
                <TableRow key={inv.id} href={`/invoices/${inv.id}`} className={overdueRowClass(inv.status)}>
                  <TableCell>
                    <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                      {inv.clientName}
                    </Link>
                    <div className="font-mono text-xs text-muted-foreground">{inv.number}</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatAmount(inv.amount)}</TableCell>
                  <TableCell className="tabular-nums">{formatInvoiceDate(inv.issuedAt)}</TableCell>
                  <TableCell>
                    <InvoiceDueCell dueAt={inv.dueAt} status={inv.status} />
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusCell status={inv.status} emailStatus={inv.emailStatus} />
                  </TableCell>
                  <TableCell>
                    <InvoiceActions invoice={inv} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
